// Packages:
import jwt from 'jsonwebtoken'

// Exports:
export const signTestAccessToken = (userId: number, email: string): string => {
  const secret = process.env['JWT_ACCESS_SECRET']
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set')

  return jwt.sign({ sub: String(userId), email, type: 'access' }, secret, { expiresIn: '15m' })
}
