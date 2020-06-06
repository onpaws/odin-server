import { Response } from 'express-serve-static-core'
import { sign } from 'jsonwebtoken'

import { User } from './entity/User'
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

export const createAccessToken = (user: User) => {
  return sign({userId: user.id}, ACCESS_TOKEN_SECRET!, { 
    expiresIn: "15m"
  })
}

export const createRefreshToken = (user: User) => {
  return sign({userId: user.id}, REFRESH_TOKEN_SECRET!, {
    expiresIn: "7d"
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