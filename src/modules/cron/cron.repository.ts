// Packages:
import { pool } from '../../config/db'

// Typescript:
interface StaleReportCycle {
  targetUsernameHash: string
  offenseNumber: number
}

interface PromotedTarget {
  targetUsername: string
  offenseNumber: number
}

// Functions:
/**
 * Applies a monthly reputation bonus to users who have reported this month,
 * and have not already received a monthly reputation award this month.
 * Increments reputation_points by 1 and sets last_monthly_rep_awarded_at.
 *
 * @returns {Promise<number>} Number of users updated
 */
const applyMonthlyReputationBonus = async (): Promise<number> => {
  const result = await pool.query(
    `
      UPDATE users
      SET
        reputation_points = reputation_points + 1,
        last_monthly_rep_awarded_at = NOW(),
        updated_at = NOW()
      WHERE last_report_at IS NOT NULL
        AND last_report_at >= date_trunc('month', CURRENT_TIMESTAMP)
        AND last_report_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
        AND (
          last_monthly_rep_awarded_at IS NULL
          OR last_monthly_rep_awarded_at < date_trunc('month', CURRENT_TIMESTAMP)
        )
    `,
  )
  return result.rowCount ?? 0
}

/**
 * Applies a 5% decay to reputation_points for users who have not
 * been active *or* reported in over 3 months, once per month.
 * Sets last_inactivity_rep_decay_at.
 *
 * @returns {Promise<number>} Number of users updated
 */
const applyInactivityReputationDecay = async (): Promise<number> => {
  const result = await pool.query(
    `
      UPDATE users
      SET
        reputation_points = GREATEST(
          0,
          reputation_points - CEIL(reputation_points * 0.05)::INT
        ),
        last_inactivity_rep_decay_at = NOW(),
        updated_at = NOW()
      WHERE last_active_at IS NOT NULL
        AND last_report_at IS NOT NULL
        AND last_active_at < NOW() - INTERVAL '3 months'
        AND last_report_at < NOW() - INTERVAL '3 months'
        AND reputation_points > 0
        AND (
          last_inactivity_rep_decay_at IS NULL
          OR date_trunc('month', last_inactivity_rep_decay_at) < date_trunc('month', CURRENT_TIMESTAMP)
        )
    `,
  )
  return result.rowCount ?? 0
}

/**
 * Promotes pending reports to 'counted' status if their reporter's
 * current reputation_points is at least 10.
 *
 * @returns {Promise<PromotedTarget[]>} Array of objects describing promoted report targets.
 */
const promotePendingReportsWhenReporterRepAtLeast10 = async (): Promise<PromotedTarget[]> => {
  const result = await pool.query<PromotedTarget>(
    `
      WITH promoted AS (
        UPDATE reports r
        SET status = 'counted'::report_status_type
        FROM users u
        WHERE r.reporter_user_id = u.id
          AND r.status = 'pending'::report_status_type
          AND u.reputation_points >= 10
        RETURNING r.target_username AS "targetUsername", r.offense_number AS "offenseNumber"
      )
      SELECT DISTINCT "targetUsername", "offenseNumber" FROM promoted
    `,
  )
  return result.rows.map(row => ({
    targetUsername: String(row.targetUsername),
    offenseNumber: Number(row.offenseNumber),
  }))
}

/**
 * Finds report cycles that are "stale" (first counted report is older than 60 days, and
 * there is no active muted account for that target/offense number).
 *
 * @returns {Promise<StaleReportCycle[]>} Array of stale report cycle objects.
 */
const findStaleReportCycles = async (): Promise<StaleReportCycle[]> => {
  const result = await pool.query<StaleReportCycle>(
    `
      SELECT
        r.target_username_hash AS "targetUsernameHash",
        r.offense_number AS "offenseNumber"
      FROM reports r
      WHERE r.status = 'counted'::report_status_type
      GROUP BY r.target_username_hash, r.offense_number
      HAVING MIN(r.reported_at) < NOW() - INTERVAL '60 days'
        AND NOT EXISTS (
          SELECT 1
          FROM muted_accounts m
          WHERE m.username_hash = r.target_username_hash
            AND m.offense_number = r.offense_number
            AND m.is_active = TRUE
        )
      ORDER BY r.target_username_hash ASC, r.offense_number ASC
    `,
  )
  return result.rows.map(row => ({
    targetUsernameHash: String(row.targetUsernameHash),
    offenseNumber: Number(row.offenseNumber),
  }))
}

/**
 * Expires all reports for the specified report cycle
 * (target username hash + offense number), where the
 * status is "pending" or "counted".
 *
 * @param {string} targetUsernameHash - The hashed target username.
 * @param {number} offenseNumber - The offense number of the report cycle.
 * @returns {Promise<number>} Number of reports updated (expired)
 */
const markReportsAsExpiredForCycle = async (targetUsernameHash: string, offenseNumber: number): Promise<number> => {
  const result = await pool.query(
    `
      UPDATE reports
      SET status = 'expired'::report_status_type
      WHERE target_username_hash = $1
        AND offense_number = $2
        AND status IN ('pending'::report_status_type, 'counted'::report_status_type)
    `,
    [targetUsernameHash, offenseNumber],
  )
  return result.rowCount ?? 0
}

// Exports:
export {
  applyMonthlyReputationBonus,
  applyInactivityReputationDecay,
  promotePendingReportsWhenReporterRepAtLeast10,
  findStaleReportCycles,
  markReportsAsExpiredForCycle,
}
export type { StaleReportCycle, PromotedTarget }
