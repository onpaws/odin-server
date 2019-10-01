import { gql } from 'apollo-server-express';

export const typeDefs = gql`
type User {
  id: ID!
  email: String!
  accessToken: String
}

type Query {
  me: User
  todos: [String]
}

type Mutation {
  register(email: String!, password: String!): Boolean!
  login(email: String!, password: String!): User
}

type Subscription {
  newMessage: String
}
`;