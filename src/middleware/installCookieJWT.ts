import { Express } from 'express'
import cookieParser from 'cookie-parser'
import { verify } from 'jsonwebtoken'
import { createAccessToken, sendRefreshToken, createRefreshToken } from '../auth'

const { REFRESH_TOKEN_SECRET } = process.env

const installCookieJWT = (app: Express) => {
  app.use(cookieParser());
  app.post('/access_token', async (req, res) => {
    const rootPgPool = app.get('rootPgPool')
    const token = req.cookies.qid  // must match the cookie name we set
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
    const { rows } = await rootPgPool.query(
      `SELECT person_id FROM app_private.person_account 
         WHERE person_id = $1
         LIMIT 1
        `,
      [payload.person_id]
    )
    if (!rows.length) {
      return res.send({ ok: false, accessToken: "" })
    }
    const { person_id } = rows[0]

    sendRefreshToken(res, createRefreshToken(person_id));
    //go ahead and refresh refresh token while we're here

    return res.send({ ok: true, access_token: createAccessToken(person_id) })
  });
};

export default installCookieJWT