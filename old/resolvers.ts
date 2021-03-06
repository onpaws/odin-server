import { IResolvers } from "graphql-tools"
import argon from 'argon2'
import { verify } from 'jsonwebtoken'
import { PubSub, AuthenticationError } from 'apollo-server-express'
import { createRefreshToken, createAccessToken, sendRefreshToken } from "./auth"

const { ACCESS_TOKEN_SECRET } = process.env;

const pubsub = new PubSub();
const SOMETHING_CHANGED_TOPIC = 'something_changed';

export const resolvers: IResolvers = {
  Query: {
    me: async (_, __, { req }) => {
      const authorization = req.headers["authorization"];
      if (!authorization) {
        throw new Error("no authorization token provided")
      }
      console.log('authorization', authorization);
      try {
        const token = authorization.split(" ")[1];
        console.log('token', token)
        const payload: any = verify(token, ACCESS_TOKEN_SECRET!);
        return User.findOne(payload.userId);
      } catch (err) {
        console.log(err);
        throw new AuthenticationError('not authenticated')
      }
    },
    todos: (_, __, context) => {
      const authorization = context.req.headers["authorization"];
      if (!authorization) throw new AuthenticationError("not authorized");
      try {
        const token = authorization.split(" ")[1];
        const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!);
        context.payload = payload as any;
      } catch (err) {
        throw new AuthenticationError('You must be logged in to see the todos.');
      }
        
      return ['todo1', 'todo2']; //TODO: map this to the database
    }
  },
  Mutation: {
    register: async (_, { email, password }) => {
      const hashedPassword = await argon.hash(password);
      await User.create({
        email,
        password: hashedPassword
      }).save();

      return {
        code: 200,
        success: true,
        message: `${email} was registered successfully`
      };
    },
    login: async (_, { email, password }, { res }) => {
      const user = await User.findOne({ where: { email } });
      if (!user) throw new Error('could not find user');

      const valid = await argon.verify(user.password, password);
      if (!valid) throw new Error('invalid credentials');
      
      sendRefreshToken(res, createRefreshToken(user));
      return {
        accessToken: createAccessToken(user),
        me: user,
        code: 200,
        success: true,
        message: `${email} logged in successfully`
      }
    },
  },
  MutationResponse: {
    __resolveType() {
      // added b/c without this, something (graphql i think) complains on startup.
      // TODO: learn what __resolveTypes are supposed to do
      // via https://www.apollographql.com/docs/apollo-server/schema/schema/#structuring-mutation-responses
      return null;
    },
  },
  Subscription: {
    newMessage: {
      subscribe: () => pubsub.asyncIterator(SOMETHING_CHANGED_TOPIC),
    }
  }
};

// publish new message every second
setInterval(
  () =>
    pubsub.publish(SOMETHING_CHANGED_TOPIC, {
      newMessage: new Date().toString(),
    }),
  1000,
);