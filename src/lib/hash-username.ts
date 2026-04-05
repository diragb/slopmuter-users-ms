// Packages:
import crypto from 'crypto'

// Functions:
const hashUsername = (username: string): string => {
  return crypto.createHash('sha256').update(username.toLowerCase()).digest('hex')
}

// Exports:
export { hashUsername }
