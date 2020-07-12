import { Express } from 'express'
import { OdinToken } from '../plugins/refreshTokenPlugin'
import cookieParser from 'cookie-parser'
import { verify } from 'jsonwebtoken'

import { signToken, sendRefreshToken } from '../plugins/refreshTokenPlugin'
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env

const installCookieJWT = (app: Express) => {
  app.use(cookieParser());
  app.post('/access_token', async (req, res) => {
    const rootPgPool = app.get('rootPgPool')
    const token = req.cookies.qid  // `qid` is arbitrary; must match whatever cookie name we set in sendRefreshToken()
    if (token) {
      try {
        const payload = verify(token, REFRESH_TOKEN_SECRET!);
        
        const { person_id, role, sub } = payload as OdinToken;
        // user lookup - if user was deleted, they no longer get a token
        const { rows } = await rootPgPool.query(
          ` SELECT person_id FROM app_private.person_account 
            WHERE person_id = $1
            LIMIT 1
          `, [person_id]
        )
        if (rows.length) {
          const { person_id } = rows[0];
          const tokenPlaintext = { person_id, role, sub }
          // go ahead and refresh refresh token while we're here
          sendRefreshToken(res, signToken(tokenPlaintext, {expiresIn: '7 days'}, REFRESH_TOKEN_SECRET!));
          return res.send({ ok: true, access_token: signToken(tokenPlaintext, {}, ACCESS_TOKEN_SECRET!) })
        }
      } catch (err) {
        // TODO: investigate if this returns a 401
        throw new Error(err)
      }
    };

    return res.send({ ok: false, accessToken: "" })
  });
};

export default installCookieJWT