import type { Logger } from 'pino'

declare global {
  namespace Express {
    interface Request {
      log: Logger
      userId: number
      email: string
    }
  }
}
