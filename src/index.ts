import './init'
import express from 'express'
import { createServer } from 'http'
import installDatabasePools from './middleware/installDatabasePools'
import installPostGraphile from './middleware/installPostGraphile'
import installFrontendProxy from './middleware/installFrontendProxy'
import installCookieJWT from './middleware/installCookieJWT'

const isDev = process.env.NODE_ENV === "development";

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
    
	app.listen(4000, () => {
	    console.log(`🚀 GraphQL endpoint ready at http://localhost:4000/graphql`);
	    console.log(`🚀 UI ready at http://localhost:4000/graphiql`)
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