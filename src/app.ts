// Packages:
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { requestLogger } from './middleware/request-logger'
import { errorHandler } from './middleware/error-handler'
import { notFoundHandler } from './middleware/not-found-handler'
import { globalLimiter } from './middleware/rate-limiter'

// Typescript:
import type { Application } from 'express'

// Constants:
import { env } from './config/env'

// Routers:
import internalEmailRouter from './modules/email/internal-email.routes'
import healthRouter from './modules/heatlh/health.routes'
import usersRouter from './modules/users/users.routes'

// Constants:
const app: Application = express()

// Middlewares:
app.use(helmet())
app.use(
  cors({
    origin: env.allowedOrigins,
    credentials: true,
  }),
)
app.use(express.json())
app.use(requestLogger)
app.use(globalLimiter)

app.use('/v1/health', healthRouter)
app.use('/v1/users', usersRouter)
if (env.internalEmailSecret) {
  app.use('/v1/internal/email', internalEmailRouter)
}

app.use(notFoundHandler)
app.use(errorHandler)

// Exports:
export default app
