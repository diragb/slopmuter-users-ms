// Packages:
import { pool } from '../../config/db'

// Typescript:
import type { QueryResultRow } from 'pg'
import type { UserStats } from '../../types'

// Functions:
/**
 * Maps a raw database row to a User object.
 *
 * @param row - Raw row from the database query result.
 * @returns A User object with properly typed fields.
 */
const mapUserStatsRow = (row: QueryResultRow): UserStats => {
  const accountsReported = Number(row['accountsReportedCount'])
  const successful = Number(row['successfulReportsCount'])
  const accuracy = accountsReported > 0 ? successful / accountsReported : null

  return {
    id: Number(row['id']),
    accountsReportedCount: accountsReported,
    successfulReportsCount: successful,
    reputationPoints: Number(row['reputationPoints']),
    accuracy,
    memberSince: String(row['createdAt']),
    lastReportAt: row['lastReportAt'] !== null ? String(row['lastReportAt']) : null,
  }
}

/**
 * Finds a user stats by their internal ID.
 *
 * @param userId - The internal user ID to look up.
 * @returns The matching user stats, or null if not found.
 */
const findUserStatsByUserId = async (userId: number): Promise<UserStats | null> => {
  const result = await pool.query(
    `
      SELECT
        id,
        accounts_reported_count AS "accountsReportedCount",
        successful_reports_count AS "successfulReportsCount",
        reputation_points AS "reputationPoints",
        created_at AS "createdAt",
        last_report_at AS "lastReportAt",
        last_monthly_rep_awarded_at AS "lastMonthlyRepAwardedAt"
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  )

  if (result.rowCount === 0) return null
  return mapUserStatsRow(result.rows[0])
}

// Exports:
export { findUserStatsByUserId }
export type { UserStats }
