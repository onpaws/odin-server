import { makeExtendSchemaPlugin, gql } from 'graphile-utils';
import jsonwebtokenPkg from 'jsonwebtoken';
const { sign } = jsonwebtokenPkg

const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env

const RefreshTokenPlugin = makeExtendSchemaPlugin((_, {pgJwtSignOptions}) => ({
  typeDefs: gql`
    input AuthenticateInput {
      email: String!,
      password: String!
    },
    extend type Mutation {
      authenticate(input: AuthenticateInput!): String
    }
  `,
  resolvers: {
    Mutation: {
      authenticate: async (_, args, context) => {
        const { email, password } = args.input;
        try {
          // Because this is auth, we use rootPgPool, which uses PostGraphile's role 
          // We don't use pgClient, b/c that's 'too late' - transaction & role is already 
          // set based on the incoming JWT.
          // Note: this means we must manually pass rootPgPool in via resolver context

          const { rows: [tokenPlaintext] } = await context.rootPgPool.query(
            ` SELECT users.* 
              FROM app_private.generate_token_plaintext($1, $2) users 
              WHERE NOT (users is null)
              LIMIT 1
            `,
            [email, password]
          )
          if (!tokenPlaintext) { // unable to auth/invalid creds
            throw new Error("not authenticated");
          }
          
          const accessToken = signToken(tokenPlaintext, pgJwtSignOptions, ACCESS_TOKEN_SECRET!)
          const refreshToken = signToken(tokenPlaintext, {...pgJwtSignOptions, expiresIn: '7 days'}, REFRESH_TOKEN_SECRET!)

          sendRefreshToken(context.res, refreshToken)
          return accessToken;
        } catch (e) {
          console.error(e);
          throw e;
        }
      }
    }
  }
}));

export default RefreshTokenPlugin

export interface OdinToken {
  role: string,           // should match what's returned by app_private.generate_token_plaintext()
  person_id: string,      // person_id -> key from the DB
  sub: string,            // 'subject' -> email address
  aud?: string,
  iss?: string,
  exp?: string
}

export const signToken = (tokenPlaintext: OdinToken, pgJwtSignOptions: any, secret: string) => 
  sign(tokenPlaintext, secret,
    Object.assign({}, pgJwtSignOptions,
      tokenPlaintext.aud || (pgJwtSignOptions && pgJwtSignOptions.audience)
        ? null : { audience: "postgraphile" },
      tokenPlaintext.iss || (pgJwtSignOptions && pgJwtSignOptions.issuer)
        ? null : { issuer: "postgraphile" },
      tokenPlaintext.exp || (pgJwtSignOptions && pgJwtSignOptions.expiresIn)
        ? null : { expiresIn: "15 mins" }
    )
  );


export const sendRefreshToken = (res: any, token: string) => {
  //TODO: switch to `res: ServerResponse` (how to make TS happy with res.cookie)
  res.cookie('qid', token, {
    httpOnly: true,
    sameSite: true,       // if you're on a single origin, this may help prevent CSRF attacks
    path: "/access_token"
  })
}