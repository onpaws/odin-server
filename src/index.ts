import './init'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { verify } from 'jsonwebtoken'
import { postgraphile } from 'postgraphile';
import PgSimplifyInflectorPlugin from "@graphile-contrib/pg-simplify-inflector";

import { createAccessToken, sendRefreshToken, createRefreshToken } from './auth'

const { REFRESH_TOKEN_SECRET } = process.env
const main = async () => {
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
		// const user = await User.findOne({ id: payload.userId })
		const user = {} || payload

        if (!user) {
            return res.send({ ok: false, accessToken: "" })
        }
        
        //go ahead and refresh refresh token while we're here
        sendRefreshToken(res, createRefreshToken(user));

        return res.send({ ok: true, access_token: createAccessToken(user) })
    });

    app.use(
        postgraphile(
            process.env.DATABASE_URL || "postgres://localhost:5432/postgraphile",
            "app_public",
            {
				appendPlugins: [PgSimplifyInflectorPlugin],  // 'allPeople' -> 'people'
				watchPg: true,
                graphiql: true,
				enhanceGraphiql: true,
				subscriptions: true,
				legacyRelations: "omit",
				ignoreRBAC: false,
				ignoreIndexes: false,
				extendedErrors: ["hint", "detail", "errcode"],
				showErrorStack: true,
				// externalUrlBase: '/graphiql'
				// graphqlRoute: '',
				enableQueryBatching: true,

            }
        )
    );
	app.listen(4000, () => {
	    console.log(`🚀 GraphQL endpoint ready at http://localhost:4000`);
	    console.log(`🚀 UI ready at http://localhost:4000/graphiql`)
	});
};

main()
.catch(e => console.error(e))
.finally(async () => {
	// TODO consider looking into Postgraphile disconnect/cleanup
})