import dotenv from 'dotenv'
import express from 'express'
import { createServer } from 'http'
import { installDatabasePools, installPostGraphile, installFrontendProxy, installCookieJWT } from './middleware/index.js'

dotenv.config();
const isDev = process.env.NODE_ENV === "development";
const { PORT } = process.env;

const main = async () => {
    const app = express();
    const httpServer = createServer(app);
    app.set('httpServer', httpServer);

    const websocketMiddlewares:any = [];
    app.set("websocketMiddlewares", websocketMiddlewares);
    await installDatabasePools(app);
    await installPostGraphile(app);
    await installCookieJWT(app);    // should come before proxy
    if (isDev) {
        // In development proxy FE into BE's origin
        await installFrontendProxy(app);
    }
    
	app.listen(PORT || 5000, () => {
	    console.log(`🚀 GraphQL endpoint ready at /graphql`);
	    console.log(`🚀 UI ready at /graphiql`)
	});
};

main()
.catch(e => {
    console.error("Fatal error occurred starting server");
    console.error(e);
    process.exit(101);
})
.finally(async () => {
	// TODO consider looking into Postgraphile disconnect/cleanup
})