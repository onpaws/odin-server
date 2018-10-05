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
2. Setup database settings inside `ormconfig.json` file
3. Run `npm start` command
