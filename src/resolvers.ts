import { IResolvers } from "graphql-tools";
import { User } from "./entity/User";
import argon from 'argon2';
import { PubSub, AuthenticationError } from 'apollo-server-express';

const pubsub = new PubSub();
const SOMETHING_CHANGED_TOPIC = 'something_changed';

export const resolvers: IResolvers = {
  Query: {
    me: async (_, __, { req }) => {
      if (!req.session.userId) {
        return null;
      }
      const user = await User.findOne(req.session.userId);
      return user;
    },
    todos: (_, __, { req }) => {
      if (!req.session.userId) {
        throw new AuthenticationError('You must be logged in to see the todos.')
      }
      return ['todo1', 'todo2'] //TODO: map this to the database
    }
  },
  Mutation: {
    register: async (_, { email, password }) => {
      const hashedPassword = await argon.hash(password);
      await User.create({
        email,
        password: hashedPassword
      }).save();

      return true;  //it worked
    },
    login: async (_, { email, password }, { req }) => {
      const user = await User.findOne({ where: { email } });
      if (!user) return null;

      const valid = await argon.verify(user.password, password)
      if (!valid) return null;

      req.session.userId = user.id  //save a cookie with their userId

      return user;
    }
  },
  Subscription: {
    newMessage: {
      subscribe: () => pubsub.asyncIterator(SOMETHING_CHANGED_TOPIC),
    }
  }
}

// publish new message every second
setInterval(
  () =>
    pubsub.publish(SOMETHING_CHANGED_TOPIC, {
      newMessage: new Date().toString(),
    }),
  1000,
);