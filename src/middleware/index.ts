import { installDatabasePools } from './installDatabasePools.js';
import { installPostGraphile } from './installPostGraphile.js';
import { installCookieJWT } from './installCookieJWT.js'
import { installFrontendProxy } from './installFrontendProxy.js';

export { installDatabasePools, installPostGraphile, installCookieJWT, installFrontendProxy }

// Jan 2021: this file's existence is to fix Dokku 'slimming' the slug by default
// TODO: consider ways to exclude http-proxy in prod