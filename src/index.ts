import './init'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { ApolloServer } from 'apollo-server-express'
import { PrismaClient } from "@prisma/client"
import { verify } from 'jsonwebtoken'

import { typeDefs } from './typeDefs'
import { resolvers } from './resolvers'
import { createAccessToken, sendRefreshToken, createRefreshToken } from './auth'
// import { handleHealthCheck } from './dbHealthCheck'

const { REFRESH_TOKEN_SECRET, ROUTE } = process.env

export const prisma = new PrismaClient();

const startServer = async () => {
    const apollo = new ApolloServer({
        typeDefs,
        resolvers,
        context: async ({ req, res, connection }: any) => {
            // via https://www.apollographql.com/docs/apollo-server/features/subscriptions.html#Context-with-Subscriptions
            if (connection) {
                // create a context for subscriptions
                console.log('subscription connection', connection);
                return { prisma };
            } else {
                // check from req
                const token = req.headers.authorization || "";
                return { token, req, res, prisma };
            }
        },
        subscriptions: { path: ROUTE! },
        tracing: true,
        cacheControl: true
    });

    const app = express();
    app.use(
        cors({
          origin: "http://localhost:3000",
          credentials: true
        })
    );
    app.use(cookieParser());
    
    
    app.post('/access_token', async (req, res) => {
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
        const user = await prisma.users.findOne({ where: { id: payload.userId } })

        if (!user) {
            return res.send({ ok: false, accessToken: "" })
        }
        
        //go ahead and refresh refresh token while we're here
        sendRefreshToken(res, createRefreshToken(user));

        return res.send({ ok: true, access_token: createAccessToken(user) })
    });

    apollo.applyMiddleware({
        app,
        path: ROUTE,
        // onHealthCheck: handleHealthCheck,
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

startServer()
.catch(e => { throw e })
.finally(async () => {
    await prisma.disconnect()
})