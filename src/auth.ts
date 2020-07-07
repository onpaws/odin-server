import { Response } from 'express-serve-static-core'
import { sign } from 'jsonwebtoken'

const {  REFRESH_TOKEN_SECRET } = process.env;

export const createAccessToken = (person_id: string) => {
  const value = { 
    role: 'app_authenticated',
    person_id
  }
  return sign(value, REFRESH_TOKEN_SECRET!, { 
    expiresIn: "15m",
    audience: "postgraphile",
    issuer: "postgraphile"
  })
}

export const createRefreshToken = (person_id: string) => {
  const value = { 
    role: 'app_authenticated',
    person_id,
  }
  return sign(value, REFRESH_TOKEN_SECRET!, {
    expiresIn: "7d",
    audience: "postgraphile",
    issuer: "postgraphile"
  })
}

export const sendRefreshToken = (res: Response, token: string) => {
  console.log('sending refresh token') 
  res.cookie("qid", token, {
    httpOnly: true,
    sameSite: true,
    path: "/access_token"
  })
}