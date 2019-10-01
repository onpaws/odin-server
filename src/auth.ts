import { Response } from 'express'
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
  console.log('sent refresh token') 
  res.cookie("qid", token, {
    httpOnly: true,
    path: "/refresh_token"
  })
}