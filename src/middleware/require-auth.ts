// Packages:
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { AuthenticationError } from '../lib/errors'

// Typescript:
interface AccessTokenPayload {
  sub: string
  email: string
  type: string
}

// Constants:
import { env } from '../config/env'

// Exports:
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.header('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('MISSING_TOKEN', 'Missing or malformed Authorization header.')
  }
  const token = authHeader.slice(7)
  const payload = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload

  if (!payload.sub || !payload.email || payload.type !== 'access')
    throw new AuthenticationError('INVALID_TOKEN', 'Invalid access token payload.')

  const userId = Number(payload.sub)
  if (Number.isNaN(userId) || userId <= 0)
    throw new AuthenticationError('INVALID_TOKEN', 'Access token contains invalid user ID.')

  req.userId = userId
  req.email = payload.email
  next()
}

export type { AccessTokenPayload }
