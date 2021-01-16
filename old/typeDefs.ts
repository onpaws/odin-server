import { gql } from 'apollo-server-express';

export const typeDefs = gql`
type User {
  id: ID!
  email: String!
}

type Query {
  me: User
  todos: [String]
}

type Mutation {
  register(email: String!, password: String!): RegisterResponse!
  login(email: String!, password: String!): LoginResponse!
}

type Subscription {
  newMessage: String
}

interface MutationResponse {
  code: String!
  success: Boolean!
  message: String!
}

type RegisterResponse implements MutationResponse {
  code: String!
  success: Boolean!
  message: String!
}

type LoginResponse implements MutationResponse {
  code: String!
  success: Boolean!
  message: String!
  accessToken: String
  me: User
}
`;