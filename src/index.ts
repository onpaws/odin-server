import { createServer } from 'http'
import express from 'express'
import session from 'express-session'
import { ApolloServer } from 'apollo-server-express'
import { createConnection } from 'typeorm'
import { typeDefs } from './typeDefs'
import { resolvers } from './resolvers'
import { handleHealthCheck } from './dbHealthCheck'

const path = '/';

const startServer = async () => {
    const apollo = new ApolloServer({
        typeDefs,
        resolvers,
        context: async ({ req, connection }: any) => {
            // via https://www.apollographql.com/docs/apollo-server/features/subscriptions.html#Context-with-Subscriptions
            if (connection) {
                // create a context for subscriptions
                console.log('connection', connection);
                return {};
            } else {
                // check from req
                const token = req.headers.authorization || "";
                return { token, req };
            }
        },
        subscriptions: { path },
        tracing: true,
        cacheControl: true
    });

    await createConnection();
    const app = express();
    app.use(session({
        secret: 'aoiwutohg',
        resave: false,
        saveUninitialized: false,
    }))

    apollo.applyMiddleware({
        app,
        path,
        onHealthCheck: handleHealthCheck,
        cors: {
            credentials: true,
            origin: 'http://localhost:3000'
        }
    });

    const httpServer = createServer(app);
    apollo.installSubscriptionHandlers(httpServer);

    httpServer.listen({ port: 4000 }, () => {
        console.log(`🚀 Server ready at http://localhost:4000${apollo.graphqlPath}`);
        console.log(`🚀 Subscriptions ready at ws://localhost:4000${apollo.subscriptionsPath}`)
    })
}

startServer();