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

  SQS_ACCOUNT_MUTED_QUEUE_URL: z.string(),
  SQS_APPEAL_RESOLVED_QUEUE_URL: z.string(),
  SQS_SUBSCRIPTION_CHANGED_QUEUE_URL: z.string(),
  AWS_REGION: z.string().default('us-east-1'),

  SES_FROM_EMAIL: z.string().optional().default(''),
  SES_REGION: z.string().optional().default(''),

  INTERNAL_EMAIL_SECRET: z.string().optional().default(''),

  REPORT_THRESHOLD_COUNT: z.coerce.number().int().positive().default(50),
  REPORT_THRESHOLD_REP: z.coerce.number().int().positive().default(500),
  VELOCITY_CHECK_THRESHOLD: z.coerce.number().int().positive().default(30),
  VELOCITY_CHECK_WINDOW_HOURS: z.coerce.number().int().positive().default(1),

  DAILY_CRON_HEARTBEAT_URL: z.string().optional().default(''),

  PAYMENTS_SERVICE_BASE_URL: z.string().optional().default(''),
  PAYMENTS_INTERNAL_SECRET: z.string().optional().default(''),
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
  sqsAccountMutedQueueUrl: rawEnv.SQS_ACCOUNT_MUTED_QUEUE_URL,
  sqsAppealResolvedQueueUrl: rawEnv.SQS_APPEAL_RESOLVED_QUEUE_URL,
  sqsSubscriptionChangedQueueUrl: rawEnv.SQS_SUBSCRIPTION_CHANGED_QUEUE_URL,
  awsRegion: rawEnv.AWS_REGION,
  sesFromEmail: rawEnv.SES_FROM_EMAIL.trim(),
  sesRegion: rawEnv.SES_REGION.trim() || rawEnv.AWS_REGION,
  internalEmailSecret: rawEnv.INTERNAL_EMAIL_SECRET,
  reportThresholdCount: rawEnv.REPORT_THRESHOLD_COUNT,
  reportThresholdRep: rawEnv.REPORT_THRESHOLD_REP,
  velocityCheckThreshold: rawEnv.VELOCITY_CHECK_THRESHOLD,
  velocityCheckWindowHours: rawEnv.VELOCITY_CHECK_WINDOW_HOURS,
  dailyCronHeartbeatUrl: rawEnv.DAILY_CRON_HEARTBEAT_URL.trim(),
  paymentsServiceBaseUrl: rawEnv.PAYMENTS_SERVICE_BASE_URL.trim(),
  paymentsInternalSecret: rawEnv.PAYMENTS_INTERNAL_SECRET,
}
