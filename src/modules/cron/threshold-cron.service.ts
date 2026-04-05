// Packages:
import { pool } from '../../config/db'
import logger from '../../lib/logger'
import { publishMessage } from '../../lib/sqs'
import { hashUsername } from '../../lib/hash-username'
import redis from '../../config/redis'
import { env } from '../../config/env'
import { computeExpiryDate } from './expiry'

// Typescript:
import type { AccountMutedEvent } from '../../types/sqs-events'

interface CountedAggregate {
  reportCount: number
  totalRepPoints: number
  categoryMask: string
}

// Constants:
const MUTE_ACCT_REDIS_KEY_PREFIX = 'mute:acct:'
const COUNTED = 'counted' as const

// Functions:
/**
 * Retrieves the count of "counted" reports and related aggregate statistics for a given target username hash and offense number.
 *
 * @param {string} targetUsernameHash - Hashed username of the report target.
 * @param {number} offenseNumber - The offense number to aggregate.
 * @returns {Promise<CountedAggregate>} An object containing the total report count, total rep points, and category mask.
 */
const getCountedReportsForTarget = async (
  targetUsernameHash: string,
  offenseNumber: number,
): Promise<CountedAggregate> => {
  const result = await pool.query<{
    reportCount: string
    totalRepPoints: string
    categoryMask: string
  }>(
    `
      SELECT
        COUNT(*)::text AS "reportCount",
        COALESCE(SUM(reporter_rep_at_time), 0)::text AS "totalRepPoints",
        COALESCE(BIT_OR(category_mask), 0)::text AS "categoryMask"
      FROM reports
      WHERE target_username_hash = $1
        AND offense_number = $2
        AND status = $3::report_status_type
    `,
    [targetUsernameHash, offenseNumber, COUNTED],
  )
  const row = result.rows[0]
  return {
    reportCount: Number(row?.reportCount ?? '0'),
    totalRepPoints: Number(row?.totalRepPoints ?? '0'),
    categoryMask: row?.categoryMask ?? '0',
  }
}

/**
 * Counts the number of reports for a target/offense in a given "surveillance" time window (hours).
 *
 * @param {string} targetUsernameHash - Hashed username of the report target.
 * @param {number} offenseNumber - The offense number.
 * @param {number} windowHours - Number of past hours to look back for recent reports.
 * @returns {Promise<number>} Number of reports observed within the window.
 */
const getReportCountInSurveillanceWindow = async (
  targetUsernameHash: string,
  offenseNumber: number,
  windowHours: number,
): Promise<number> => {
  const result = await pool.query<{ reportCount: string }>(
    `
      SELECT COUNT(*)::text AS "reportCount"
      FROM reports
      WHERE target_username_hash = $1
        AND offense_number = $2
        AND reported_at >= NOW() - make_interval(hours => $3)
    `,
    [targetUsernameHash, offenseNumber, windowHours],
  )
  return Number(result.rows[0]?.reportCount ?? '0')
}

/**
 * Returns an array of user IDs for users whose reports for this target/offense have been "counted".
 *
 * @param {string} targetUsernameHash - Hashed username of the report target.
 * @param {number} offenseNumber - The offense number.
 * @returns {Promise<number[]>} An array of reporter user IDs for counted reports (ordered).
 */
const findReporterIdsCounted = async (targetUsernameHash: string, offenseNumber: number): Promise<number[]> => {
  const result = await pool.query<{ id: number }>(
    `
      SELECT reporter_user_id AS id
      FROM reports
      WHERE target_username_hash = $1
        AND offense_number = $2
        AND status = $3::report_status_type
      ORDER BY reporter_user_id ASC
    `,
    [targetUsernameHash, offenseNumber, COUNTED],
  )
  return result.rows.map(row => Number(row.id))
}

/**
 * Upserts a row in the muted_accounts table for this target/offense; resets related columns.
 *
 * @param {Object} input - Input containing the mute details.
 * @param {string} input.usernameHash - Hashed username.
 * @param {string} input.username - Plain username.
 * @param {number} input.reportCount - Report count.
 * @param {number} input.totalRepPoints - Total reporter rep.
 * @param {string} input.categoryMask - Bitmask of reported categories.
 * @param {number} input.offenseNumber - The offense number.
 * @returns {Promise<{ id: number }>} The new or updated muted account's ID.
 */
const upsertMutedAccount = async (input: {
  usernameHash: string
  username: string
  reportCount: number
  totalRepPoints: number
  categoryMask: string
  offenseNumber: number
}): Promise<{ id: number }> => {
  const result = await pool.query<{ id: number }>(
    `
      INSERT INTO muted_accounts (
        username_hash,
        username,
        report_count,
        total_rep_points,
        category_mask,
        offense_number,
        is_active,
        promoted_at,
        deactivated_at,
        deactivation_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NULL, NULL)
      ON CONFLICT (username_hash)
      DO UPDATE SET
        username = EXCLUDED.username,
        report_count = EXCLUDED.report_count,
        total_rep_points = EXCLUDED.total_rep_points,
        category_mask = EXCLUDED.category_mask,
        offense_number = EXCLUDED.offense_number,
        is_active = TRUE,
        promoted_at = NOW(),
        deactivated_at = NULL,
        deactivation_reason = NULL
      RETURNING id
    `,
    [
      input.usernameHash,
      input.username,
      input.reportCount,
      input.totalRepPoints,
      input.categoryMask,
      input.offenseNumber,
    ],
  )
  return { id: Number(result.rows[0]?.id) }
}

/**
 * Inserts a mute expiry record for a given muted account.
 *
 * @param {number} mutedAccountId - The ID of the muted account.
 * @param {Date} expiresAt - The expiration date for the mute.
 * @returns {Promise<void>}
 */
const insertMuteExpiry = async (mutedAccountId: number, expiresAt: Date): Promise<void> => {
  await pool.query(
    `
      INSERT INTO mute_expiry (muted_account_id, expires_at)
      VALUES ($1, $2)
    `,
    [mutedAccountId, expiresAt],
  )
}

/**
 * Re-checks mute thresholds for a target username after reports have been auto-promoted
 * by the cronjob, applying mute if thresholds are met. Updates mute state in database and redis,
 * and publishes an SQS event if a mute occurs.
 *
 * @param {string} targetUsername - The plain username (will be hashed).
 * @param {number} offenseNumber - The offense number.
 * @param {string} correlationId - For trace/debug/audit logging and event correlation.
 * @returns {Promise<void>}
 */
const evaluateMuteThresholdForTarget = async (
  targetUsername: string,
  offenseNumber: number,
  correlationId: string,
): Promise<void> => {
  const targetUsernameHash = hashUsername(targetUsername)

  const countedReportsAggregate = await getCountedReportsForTarget(targetUsernameHash, offenseNumber)
  const recentReportCount = await getReportCountInSurveillanceWindow(
    targetUsernameHash,
    offenseNumber,
    env.velocityCheckWindowHours,
  )

  if (recentReportCount >= env.velocityCheckThreshold) {
    logger.warn(
      {
        targetUsernameHash,
        offenseNumber,
        recentReportCount,
        windowHours: env.velocityCheckWindowHours,
        threshold: env.velocityCheckThreshold,
        correlationId,
      },
      'Daily cron: velocity check triggered; skipping mute promotion',
    )
    return
  }

  if (
    countedReportsAggregate.reportCount < env.reportThresholdCount ||
    countedReportsAggregate.totalRepPoints < env.reportThresholdRep
  ) {
    return
  }

  const mutedAccount = await upsertMutedAccount({
    categoryMask: countedReportsAggregate.categoryMask,
    reportCount: countedReportsAggregate.reportCount,
    totalRepPoints: countedReportsAggregate.totalRepPoints,
    offenseNumber,
    username: targetUsername,
    usernameHash: targetUsernameHash,
  })

  const muteExpiresAt = computeExpiryDate(offenseNumber)
  await insertMuteExpiry(mutedAccount.id, muteExpiresAt)

  const muteAccountRedisKey = `${MUTE_ACCT_REDIS_KEY_PREFIX}${targetUsernameHash}`
  await redis.call('BITFIELD', muteAccountRedisKey, 'SET', 'u64', '0', String(countedReportsAggregate.categoryMask))
  await redis.call('EXPIREAT', muteAccountRedisKey, Math.floor(muteExpiresAt.getTime() / 1000))

  const reporterUserIds = await findReporterIdsCounted(targetUsernameHash, offenseNumber)
  const event: AccountMutedEvent = {
    type: 'account.muted',
    mutedAccountId: mutedAccount.id,
    targetUsername,
    offenseNumber,
    reporterUserIds,
    correlationId,
  }
  await publishMessage(env.sqsAccountMutedQueueUrl, event, correlationId)
}

// Exports:
export { evaluateMuteThresholdForTarget }
