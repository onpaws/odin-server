import { makeExtendSchemaPlugin, gql } from 'graphile-utils'

const RefreshTokenPlugin = makeExtendSchemaPlugin((build) => ({
  typeDefs: gql`
    extend type Mutation {
      authenticate2(input: AuthenticateInput!): String
    }
  `,
  resolvers: {
    Mutation: {
      authenticate2: async (_, args, context, resolveInfo) => {
        const { email, password } = args.input;
        const { graphql: { graphql } } = build
        try {
          const document = `
            mutation AuthenticateCookie($email: String!, $password: String!) {
              authenticatecookie(input: { email: $email, password: $password }) {
                jwtTokens
              }
            }
          `;
          const operationName = 'AuthenticateCookie';
          const variables = { email, password };
          const { data } = await graphql(
            resolveInfo.schema,
            document,
            null,
            context,
            variables,
            operationName
          );
          const accessToken = data?.authenticatecookie?.jwtTokens[0]
          const refreshToken = data?.authenticatecookie?.jwtTokens[1]
          
          context.res.cookie("qid", refreshToken, {
            httpOnly: true,
            sameSite: true,
            path: "/access_token"
          })

          return accessToken;
        } catch (e) {
          console.error(e);
          throw e;
        }
      }
    }
  }
})
);

export default RefreshTokenPlugin