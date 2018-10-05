import { IResolvers } from "graphql-tools";
import { User } from "./entity/User";
import * as argon from 'argon2';

export const resolvers: IResolvers = {
  Query: {
    me: async (_, __, { req }) => {
      if (!req.session.userId) {
        return null;
      }
      const user = await User.findOne(req.session.userId);
      return user;
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
  }
}