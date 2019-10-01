import './init'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { ApolloServer } from 'apollo-server-express'
import { createConnection } from 'typeorm'
import { verify } from 'jsonwebtoken'

import { typeDefs } from './typeDefs'
import { resolvers } from './resolvers'
import { createAccessToken, sendRefreshToken, createRefreshToken } from './auth'
import { User } from './entity/User'
import { handleHealthCheck } from './dbHealthCheck'

const { REFRESH_TOKEN_SECRET, ROUTE } = process.env
const startServer = async () => {
    const apollo = new ApolloServer({
        typeDefs,
        resolvers,
        context: async ({ req, res, connection }: any) => {
            // via https://www.apollographql.com/docs/apollo-server/features/subscriptions.html#Context-with-Subscriptions
            if (connection) {
                // create a context for subscriptions
                console.log('subscription connection', connection);
                return {};
            } else {
                // check from req
                const token = req.headers.authorization || "";
                return { token, req, res };
            }
        },
        subscriptions: { path: ROUTE! },
        tracing: true,
        cacheControl: true
    });

    await createConnection();
    const app = express();
    app.use(
        cors({
          origin: "http://localhost:3000",
          credentials: true
        })
    );
    app.use(cookieParser());
    
    
    app.post('/refresh_token', async (req, res) => {
        const token = req.cookies.qid
        if (!token) {
            return res.send({ ok: false, accessToken: "" })
        }

        let payload: any = null;
        try {
            payload = verify(token, REFRESH_TOKEN_SECRET!);
        } catch (err) {
            console.log(err);
            return res.send({ ok: false, accessToken: "" })
        }
        const user = await User.findOne({ id: payload.userId })

        if (!user) {
            return res.send({ ok: false, accessToken: "" })
        }
        
        //go ahead and refresh refresh token while we're here
        sendRefreshToken(res, createRefreshToken(user));

        return res.send({ ok: true, accessToken: createAccessToken(user) })
    });

    apollo.applyMiddleware({
        app,
        path: ROUTE,
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
};

startServer();