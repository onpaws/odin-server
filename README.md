# Odin Server
Backend for Odin

## Dependencies:

 - Postgres [1]
 - TypeScript
 - Apollo Server 2
 - TypeORM


## Technical Notes
[1] Postgres requires enabling UUIDs. As a Postgres admin, enable UUID support via:
  ```
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
  ```

# Awesome Project Build with TypeORM
        
Steps to run this project:

1. Run `npm i` command
2. Setup Postgres user, database, and enable uuid-ossp extension inside `ormconfig.json` file
  (e.g. from a shell run:)
  ```
  psql postgres
  CREATE ROLE odin-user
  ALTER USER odin-user LOGIN
  CREATE DATABASE odin
  EXIT
  psql odin`
  CREATE EXTENSION "uuid-ossp"
  ```
3. `cp .env.example .env`
4. Run `npm start` command


```graphql
mutation RegisterPerson {
  registerPerson(input: {firstName: "Liam", lastName: "Gleesome", email: "bob@bob.com", password: "bob@bob.com"}) {
    person {
      id
    }
  }
}

mutation Authenticate {
  authenticate(input: { email: "bob@bob.com", password: "bob@bob.com" })
}

mutation CreatePost {
  createPost(input: {post: {headline: "My Awesome Post", body: "Lorem ipsum dolor sit amet"}}) {
    post {
      id
    }
  }
}

query Posts {
  posts {
    nodes {
      body
      headline
    }
  }
}


```