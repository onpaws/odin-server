# Odin Server
Backend for Odin

### Dependencies:
 - Postgres
 - TypeScript
 - PostGraphile

Steps to run this project:
1. Run `yarn` to install deps, also install Postgres
2. `cp .env.example .env`
3. Step through `odin-db-init-postgraphile.sql` and copypasta each piece into `psql`
4. Run `yarn start`

### Commonly needed queries
Consider reviewing the [example](./src/odin-graphql-common-queries.md) queries.