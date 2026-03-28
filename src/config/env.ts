// Packages:
import { config } from 'dotenv'
import { z } from 'zod'
import logger from '../lib/logger'

// Functions:
config()

// Constants:
const envSchema = z.object({
  SERVICE_NAME: z.string().min(1).default('users-service'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8081),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(1),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  APP_BASE_URL: z.string().default(''),
  ALLOWED_ORIGINS: z
    .string()
    .default('chrome-extension://mcihoalbpibkcngfpohfolldkicapgcj,https://slopmuter.com,http://localhost:3000'),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  logger.fatal({ description: z.treeifyError(parsedEnv.error) }, 'Invalid environment variables!')
  process.exit(1)
}

const rawEnv = parsedEnv.data

// Exports:
export const env = {
  serviceName: rawEnv.SERVICE_NAME,
  nodeEnv: rawEnv.NODE_ENV,
  port: rawEnv.PORT,
  databaseUrl: rawEnv.DATABASE_URL,
  jwtAccessSecret: rawEnv.JWT_ACCESS_SECRET,
  redisUrl: rawEnv.REDIS_URL,
  appBaseUrl: rawEnv.APP_BASE_URL,
  allowedOrigins: rawEnv.ALLOWED_ORIGINS.split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
}
