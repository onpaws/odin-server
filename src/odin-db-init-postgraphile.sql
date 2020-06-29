-- Original demo: https://www.youtube.com/watch?v=b3pwlCDy6vY
-- Benjie: https://www.youtube.com/watch?v=BNLcHlMn5X4

CREATE DATABASE IF NOT EXISTS postgraphile;

CREATE SCHEMA app_public;

CREATE TABLE app_public.person (
  id serial primary key,
  first_name text not null,
  last_name text
) ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE app_public.person IS 'A human user of our app';
ALTER TABLE app_public.person ENABLE ROW LEVEL SECURITY;

CREATE TABLE app_public.post (
  id serial primary key,
  headline text not null,
  body text,
  author_id integer not null references app_public.person(id)
) ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON "app_public"."post"("author_id");
ALTER TABLE app_public.post ENABLE ROW LEVEL SECURITY;

CREATE TABLE app_public.comment (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES app_public.post(id),
  author_id TEXT NOT NULL
);
CREATE INDEX ON "app_public"."comment"("post_id");
ALTER TABLE app_public.comment ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION app_public.person_full_name(person app_public.person) RETURNS TEXT AS $$
  SELECT person.first_name || ' ' || person.last_name
$$ language sql stable;

CREATE FUNCTION app_public.search_posts(search text) returns SETOF app_public.post AS $$
  SELECT post.*
  FROM app_public.post AS post
  WHERE post.headline ilike ('%' || search || '%') OR post.body ilike ('%' || search || '%')
$$ language sql stable;

-- Setup Google Spreadsheet ingest. 
-- These Google Sheets are set to public. If private sheets needed consider Multicorn
CREATE EXTENSION IF NOT EXISTS file_fdw;

CREATE SERVER fdw_files
  FOREIGN DATA WRAPPER file_fdw;
COMMENT ON SERVER fdw_files IS 'Allows foreign table (FDW) to call wget and pipe in results via STDIN';

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
COMMENT ON FOREIGN TABLE app_public.fdw_food IS E'@omit\nPoints to Google Sheet of user-provided food spot data';

CREATE FOREIGN TABLE app_public.fdw_booze (
  "name" varchar NOT NULL,
  "address" varchar NULL,
  "cuisine" varchar NULL,
  "notes" varchar NULL,
  "rating" varchar NULL,
  "price" varchar NULL,
  "intentToGoBack" varchar NULL
)
SERVER fdw_files
OPTIONS (program 'wget -q -O - "https://docs.google.com/spreadsheets/d/1n6vdFK8wOqJNMtQnAFSDAwBWH1CfVw2O8B-WmAmLeFI/export?gid=1609009485&format=csv"', format 'csv', header 'true');
COMMENT ON FOREIGN TABLE app_public.fdw_booze IS E'@omit\nPoints to Google Sheet of user-provided drink spot data';

CREATE MATERIALIZED VIEW app_public.food AS SELECT * FROM app_public.fdw_food;
COMMENT ON MATERIALIZED VIEW app_public.food is
  E'@omit create,update,delete\nFood data from Gsheet (materialized view)';

CREATE MATERIALIZED VIEW app_public.drink AS SELECT * FROM app_public.fdw_booze;
COMMENT ON MATERIALIZED VIEW app_public.drink is
  E'@omit create,update,delete\nDrink data from Gsheet (materialized view)';

REFRESH MATERIALIZED VIEW food;
REFRESH MATERIALIZED VIEW drink;