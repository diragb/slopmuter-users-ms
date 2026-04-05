// Packages:
import app from './app'
import { closeDatabasePool, verifyDatabaseConnection } from './config/db'
import { startSqsConsumers } from './modules/sqs/sqs-consumer'
import { runDailyCron } from './modules/cron/daily-cron'
import logger from './lib/logger'

// Constants:
import { env } from './config/env'

// Constants:
const isCronDailyMode = process.argv.includes('--cron-daily')

// Functions:
const runCronDailyAndExit = async (): Promise<void> => {
  try {
    await verifyDatabaseConnection()
    await runDailyCron()
  } catch (err) {
    logger.error({ err }, 'Daily cron failed')
    process.exitCode = 1
  } finally {
    try {
      await closeDatabasePool()
    } catch (closeErr) {
      logger.error({ err: closeErr }, 'Error while closing database pool after cron')
      process.exitCode = 1
    }
  }
  process.exit(process.exitCode ?? 0)
}

const startServer = async (): Promise<void> => {
  await verifyDatabaseConnection()

  app.set('trust proxy', 1)

  const server = app.listen(env.port, () => {
    logger.info(`${env.serviceName} is running on http://localhost:${env.port}`)
    startSqsConsumers()
  })

  const shutdown = (signal: string): void => {
    logger.fatal(`${signal} received, shutting down ${env.serviceName}`)

    server.close(async serverError => {
      if (serverError) {
        logger.error({ error: serverError }, 'Error while shutting down server')
        process.exit(1)
      }

      try {
        await closeDatabasePool()
        process.exit(0)
      } catch (databaseError) {
        logger.error({ error: databaseError }, 'Error while closing database pool')
        process.exit(1)
      }
    })
  }

  process.on('sigint', () => {
    shutdown('sigint')
  })
  process.on('sigterm', () => {
    shutdown('sigterm')
  })
}

// Execution:
if (isCronDailyMode) {
  void runCronDailyAndExit()
} else {
  startServer().catch(error => {
    logger.error({ error: error }, 'Failed to start server')
    process.exit(1)
  })
}
