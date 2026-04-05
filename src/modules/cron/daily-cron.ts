// Packages:
import crypto from 'crypto'
import {
  applyInactivityReputationDecay,
  applyMonthlyReputationBonus,
  findStaleReportCycles,
  markReportsAsExpiredForCycle,
  promotePendingReportsWhenReporterRepAtLeast10,
} from './cron.repository'
import { evaluateMuteThresholdForTarget } from './threshold-cron.service'

// Constants:
import { env } from '../../config/env'
import logger from '../../lib/logger'

// Functions:
const runStep = async (name: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn()
  } catch (err) {
    logger.error({ err }, `Daily cron step failed: ${name}`)
  }
}

const pingBetterStackHeartbeat = async (): Promise<void> => {
  if (!env.dailyCronHeartbeatUrl) return

  try {
    const response = await fetch(env.dailyCronHeartbeatUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      logger.warn({ status: response.status }, 'Daily cron: BetterStack heartbeat returned non-OK status')
    } else {
      logger.info('Daily cron: BetterStack heartbeat OK')
    }
  } catch (err) {
    logger.error({ err }, 'Daily cron: BetterStack heartbeat request failed')
  }
}

const runDailyCron = async (): Promise<void> => {
  logger.info('Daily cron started')

  await runStep('monthly_reputation_bonus', async () => {
    const updated = await applyMonthlyReputationBonus()
    logger.info({ usersUpdated: updated }, 'Daily cron: monthly reputation bonus')
  })

  await runStep('inactivity_reputation_decay', async () => {
    const updated = await applyInactivityReputationDecay()
    logger.info({ usersUpdated: updated }, 'Daily cron: inactivity reputation decay')
  })

  await runStep('promote_pending_reports', async () => {
    const targets = await promotePendingReportsWhenReporterRepAtLeast10()
    logger.info({ promotedCycles: targets.length }, 'Daily cron: promoted pending reports to counted')
    for (const target of targets) {
      const correlationId = `cron-daily-${crypto.randomUUID()}`
      await runStep(`threshold_${target.targetUsername}_${target.offenseNumber}`, async () => {
        await evaluateMuteThresholdForTarget(target.targetUsername, target.offenseNumber, correlationId)
      })
    }
  })

  await runStep('report_cycle_ttl_cleanup', async () => {
    const stale = await findStaleReportCycles()
    let totalExpired = 0
    for (const cycle of stale) {
      const expiredReportCount = await markReportsAsExpiredForCycle(cycle.targetUsernameHash, cycle.offenseNumber)
      totalExpired += expiredReportCount
    }
    logger.info({ staleCycles: stale.length, reportsExpired: totalExpired }, 'Daily cron: TTL cleanup')
  })

  await pingBetterStackHeartbeat()

  logger.info('Daily cron finished')
}

// Exports:
export { runDailyCron }
