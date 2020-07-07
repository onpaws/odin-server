-- Original demo: https://www.youtube.com/watch?v=b3pwlCDy6vY
-- Benjie: https://www.youtube.com/watch?v=BNLcHlMn5X4

-- from Terminal, run:
$ createdb postgraphile;

-- Install recommended extensions
CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- While we could use default 'public', if our postgres has more than one app in the future this is useful
CREATE SCHEMA app_public;

-- We need a private place to store creds, e.g. email/password. Let's use a private schema!
-- Separation of concerns - sensitive stuff would NOT be exposed via GraphQL/Postgraphile
CREATE SCHEMA app_private;

-- Postgres functions are executable in public namespace by default, disable this.
-- After schema creation and before function creation
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM public;

CREATE TABLE app_public.person (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  first_name  TEXT NOT NULL CHECK (char_length(first_name) < 80),
  last_name   TEXT CHECK (char_length(last_name) < 80),
  about       TEXT,
  created_at  TIMESTAMP DEFAULT now()
);
ALTER TABLE app_public.person ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE app_public.person IS 'A human user of the app';
COMMENT ON COLUMN app_public.person.id is 'The primary unique identifier for the person.';
COMMENT ON COLUMN app_public.person.first_name is 'The person’s first name.';
COMMENT ON COLUMN app_public.person.last_name is 'The person’s last name.';
COMMENT ON COLUMN app_public.person.about is 'A short description about the user, written by the user.';
COMMENT ON COLUMN app_public.person.created_at is 'The time this person was created.';

CREATE TABLE app_public.post (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  headline    TEXT NOT NULL,
  body        TEXT,
  author_id   UUID NOT NULL REFERENCES app_public.person(id),
  created_at  TIMESTAMP DEFAULT now()
);
CREATE INDEX ON app_public.post(author_id);
ALTER TABLE app_public.post ENABLE ROW LEVEL SECURITY;

CREATE TABLE app_public.comment (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  post_id   UUID NOT NULL REFERENCES app_public.post(id),
  author_id UUID NOT NULL
);
CREATE INDEX ON app_public.comment(post_id);
ALTER TABLE app_public.comment ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION app_public.person_full_name(person app_public.person) RETURNS TEXT AS $$
  SELECT person.first_name || ' ' || person.last_name
$$ language sql stable;

CREATE FUNCTION app_public.search_posts(search text) returns SETOF app_public.post AS $$
  SELECT post.*
  FROM app_public.post AS post
  WHERE post.headline ilike ('%' || search || '%') OR post.body ilike ('%' || search || '%')
$$ language sql stable;

CREATE TABLE app_public.blah (
  id SERIAL PRIMARY KEY,
  stuff JSONB NOT NULL
);
COMMENT ON TABLE app_public.person IS 'Experimental JSON storage table';

-- Setup Google Spreadsheet ingest. 
-- These Google Sheets are set to public. If private sheets needed consider Multicorn
CREATE EXTENSION IF NOT EXISTS file_fdw;

CREATE SERVER fdw_files FOREIGN DATA WRAPPER file_fdw;
COMMENT ON SERVER fdw_files IS 'Allows foreign table (FDW) to fetch data via wget';

CREATE FOREIGN TABLE app_public.fdw_food (
  "name" varchar NOT NULL,
  "address" varchar NULL,
  "cuisine" varchar NULL,
  "notes" varchar NULL,
  "rating" varchar NULL,
  "price" varchar NULL,
  "intentToGoBack" varchar NULL
)
SERVER fdw_files
OPTIONS (PROGRAM 'wget -q -O - "https://docs.google.com/spreadsheets/d/1n6vdFK8wOqJNMtQnAFSDAwBWH1CfVw2O8B-WmAmLeFI/export?gid=0&format=tsv"', FORMAT 'csv', HEADER 'true', DELIMITER U&'\0009');
COMMENT ON FOREIGN TABLE app_public.fdw_food IS E'@omit\nPoints to Google Sheet of user-provided food spot data. FDWs are probably too slow to call directly by end users thus are omitted from the GraphQL API.';

CREATE FOREIGN TABLE app_public.fdw_booze (
  "name" varchar NOT NULL,
  "address" varchar NULL,
  "vibe" varchar NULL,
  "notes" varchar NULL,
  "rating" varchar NULL,
  "price" varchar NULL,
  "intentToGoBack" varchar NULL
)
SERVER fdw_files
OPTIONS (program 'wget -q -O - "https://docs.google.com/spreadsheets/d/1n6vdFK8wOqJNMtQnAFSDAwBWH1CfVw2O8B-WmAmLeFI/export?gid=1609009485&format=csv"', format 'csv', header 'true');
COMMENT ON FOREIGN TABLE app_public.fdw_booze IS E'@omit\nPoints to Google Sheet of user-provided drink spot data. FDWs are probably too slow to call directly by end users thus are omitted from the GraphQL API.';

CREATE MATERIALIZED VIEW app_public.food AS SELECT row_number() OVER (order by name) AS id, * FROM app_public.fdw_food;
COMMENT ON MATERIALIZED VIEW app_public.food IS
  E'@primaryKey id\nFood data from Gsheet (materialized view, should be in GraphQL API)';

CREATE MATERIALIZED VIEW app_public.drink AS SELECT row_number() over (order by name) AS id, * FROM app_public.fdw_booze;
COMMENT ON MATERIALIZED VIEW app_public.drink IS
  E'@primaryKey id\nDrink data from Gsheet (materialized view, should be in GraphQL API)';

-- Optional: if you want UUID-style ids, use these lines
-- CREATE MATERIALIZED VIEW app_public.food AS SELECT MD5(textin(record_out(fdw_food))) as id, * FROM app_public.fdw_food;
-- CREATE MATERIALIZED VIEW app_public.drink AS SELECT MD5(textin(record_out(fdw_booze))) as id, * FROM app_public.fdw_booze;

-- How to refresh:
-- REFRESH MATERIALIZED VIEW food;
-- REFRESH MATERIALIZED VIEW drink;

-- *************************************************************************************
-- AuthN and AuthZ *********************************************************************
-- *************************************************************************************
-- https://www.graphile.org/postgraphile/postgresql-schema-design/#storing-emails-and-passwords

-- use the private schema to store things (password hashes) not intended for public GQL
CREATE TABLE app_private.person_account (
  person_id        UUID PRIMARY KEY REFERENCES app_public.person(id) ON DELETE CASCADE,
  email            TEXT NOT NULL unique CHECK (email ~* '^.+@.+\..+$'),
  password_hash    TEXT NOT NULL
);
COMMENT ON TABLE app_private.person_account is 'Private information about a person’s account';
COMMENT ON COLUMN app_private.person_account.person_id is 'The id of the person associated with this account';
COMMENT ON COLUMN app_private.person_account.email is 'The email address of the person';
COMMENT ON COLUMN app_private.person_account.password_hash is 'An opaque hash of the person’s password';

-- Enable crypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- New users registering should insert rows in app_public.person and app_private.person_account
CREATE FUNCTION app_public.register_person(
  first_name TEXT,
  last_name TEXT,
  email CITEXT,
  password TEXT
) RETURNS app_public.person as $$
DECLARE
  person app_public.person;
BEGIN
  INSERT INTO app_public.person (first_name, last_name) VALUES
    (first_name, last_name)
    RETURNING * into person;

  INSERT INTO app_private.person_account (person_id, email, password_hash) VALUES
    (person.id, email, crypt(password, gen_salt('bf', 9)));

  RETURN person;
END;
$$ LANGUAGE plpgsql strict SECURITY DEFINER;
-- SECURITY DEFINER means that this function is executed with the privileges of the Postgres user who created it.
-- *users* can't insert records into person_account, but this function can b/c the user who created it can. 
COMMENT ON FUNCTION app_public.register_person(TEXT, TEXT, TEXT, TEXT) IS 'Registers a single user and creates an account.';

-- Let's switch from Postgraphile connecting as SUPERUSER to a custom role:
CREATE ROLE app_postgraphile LOGIN PASSWORD '09$6k3eVq2vnJoOaIaIWh' NOINHERIT;
COMMENT ON ROLE app_postgraphile IS 'Intended for Postgraphile to log itself into Postgres with (hence why LOGIN option)';

CREATE ROLE app_anonymous;
GRANT app_anonymous TO app_postgraphile; -- !critical! for pgDefaultRole PostGraphile setting
COMMENT ON ROLE app_anonymous IS 'Intended for unauthenticated/public users. app_postgraphile can control and become app_anonymous';

CREATE ROLE app_authenticated;
GRANT app_authenticated TO app_postgraphile; -- logged in users switch to this role
COMMENT ON ROLE app_anonymous IS 'Intended for users that logged in. app_postgraphile becomes app_authenticated';

-- When PostGraphile gets a JWT from an HTTP request’s Authorization header, like so:
-- Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhIjoxL
-- It will verify the token using the secret, then will serialize the claims in that token to the database.
-- So, if we had set a JWT of: { "a": 1 }, it would effectively run
-- SET LOCAL jwt.claims.a to 1;
-- Thus using SQL you could get the value like this:
-- SELECT current_setting('jwt.claims.a', true);

-- NOTE: role claims are special cased - PostGraphile will set the Postgres role
-- { role: 'app_authenticated' } -> SET LOCAL ROLE TO 'app_authenticated'

-- How to set the JWT?
-- PostGraphile uses a composite type (similar to a table but can't store rows) to turn into a JWT

CREATE TYPE app_public.jwt_token AS (
  role TEXT,
  person_id UUID,
  exp BIGINT
);

-- Now we need a function to actually return the token:
CREATE FUNCTION app_public.authenticate(
  email TEXT,
  password TEXT
) RETURNS app_public.jwt_token AS $$
DECLARE
  account app_private.person_account;
BEGIN
  SELECT a.* INTO account
  FROM app_private.person_account as a
  WHERE a.email = $1;

  IF account.password_hash = crypt(password, account.password_hash) THEN
    RETURN('app_authenticated', account.person_id, extract(epoch from (now() + interval '2 days')))::app_public.jwt_token;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql STRICT SECURITY DEFINER;

COMMENT ON FUNCTION app_public.authenticate(text, text) is 'Creates a JWT token that will securely identify a person and give them certain permissions. This token expires in 2 days';

-- Great! Now PostGraphile will return a JWT when users log in.
-- Now lets create a function to return who's currently executing the query 
CREATE FUNCTION app_public.current_person() RETURNS app_public.person as $$
  SELECT * 
  FROM app_public.person
  WHERE id = NULLIF(current_setting('jwt.claims.person_id', true), '')::UUID
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION app_public.current_person() is 'Gets the person who was identified by our JWT';
-- PostGraphile will serialize the JWT to Postgres in the form of transaction local settings
-- current_person() is how we access those settings


-- OK, time to setup permissions!

GRANT USAGE ON SCHEMA app_public TO app_anonymous, app_authenticated;
-- allows anonymous and auth'd users to know the schema exists
-- note we did not grant usage to the private schema

GRANT SELECT ON TABLE app_public.person TO app_anonymous, app_authenticated;
-- anon and auth'd users can read all the rows in the person table

GRANT UPDATE, DELETE ON TABLE app_public.person TO app_authenticated;
-- only logged in users can modify the person table. NOTE still needs to be locked down with RLS

GRANT SELECT ON TABLE app_public.post TO app_anonymous, app_authenticated;
-- anon and auth'd users can read all the rows in the posts table
GRANT INSERT, UPDATE, DELETE ON TABLE app_public.post TO app_authenticated;
-- only logged in users can modify the posts table. NOTE still needs to be locked down with RLS

-- GRANT USAGE ON SEQUENCE app_public.post_id_seq TO app_authenticated; --only useful for int primary keys
-- when a user makes a new post, they need to know the next item in sequence b/c we use SERIAL data type for id col

GRANT EXECUTE ON FUNCTION app_public.person_full_name(app_public.person) TO app_anonymous, app_authenticated;
GRANT EXECUTE ON FUNCTION app_public.search_posts(text) TO app_anonymous, app_authenticated;
GRANT EXECUTE ON FUNCTION app_public.authenticate(text, text) TO app_anonymous, app_authenticated;
GRANT EXECUTE ON FUNCTION app_public.current_person() TO app_anonymous, app_authenticated;
-- must whitelist all functions b/c we revoked function execution perms up top

GRANT EXECUTE ON FUNCTION app_public.register_person(text, text, text, text) TO app_anonymous;
-- only anon users should need to logon

GRANT EXECUTE ON FUNCTION uuid_generate_v1mc TO app_authenticated;
-- tables with UUIDs require extra perm to make next record

-- NOW, it's time to use RLS!

CREATE POLICY select_person ON app_public.person FOR SELECT USING (true);
CREATE POLICY select_post ON app_public.post FOR SELECT USING (true);
-- both anon and auth's users can see all rows again

CREATE POLICY update_person ON app_public.person FOR UPDATE TO app_authenticated
  USING (id = nullif(current_setting('jwt.claims.person_id', true), '')::UUID);
CREATE POLICY delete_person on app_public.person FOR DELETE TO app_authenticated
  USING (id = nullif(current_setting('jwt.claims.person_id', true), '')::UUID);
-- only when person_id matches the row's ID will they be allowed to edit/delete their person record

CREATE POLICY insert_post ON app_public.post FOR INSERT TO app_authenticated
  WITH CHECK (author_id = nullif(current_setting('jwt.claims.person_id', true), '')::UUID);

CREATE POLICY update_post ON app_public.post FOR UPDATE TO app_authenticated
  USING (author_id = nullif(current_setting('jwt.claims.person_id', true), '')::UUID);

CREATE POLICY delete_post ON app_public.post FOR DELETE TO app_authenticated
  USING (author_id = nullif(current_setting('jwt.claims.person_id', true), '')::UUID);
-- logged in users can edit their own posts only

GRANT SELECT ON app_public.food TO app_authenticated;
-- only logged in users can see Foods
GRANT SELECT ON app_public.drink TO app_authenticated;
-- only logged in users can see Drinks

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app_public.blah TO app_authenticated;
-- only logged in users can edit blahs (JSON test)
GRANT USAGE ON SEQUENCE app_public.blah_id_seq TO app_authenticated;
-- when a user makes a new post, they need to know the next item in sequence b/c we use SERIAL data type for id col

GRANT SELECT ON app_public.posts TO app_authenticated;

-- Good Postgres practice to create a role with CREATEDB CREATEROLE but NOT superuser privs.
-- Use this role for day to day admin...