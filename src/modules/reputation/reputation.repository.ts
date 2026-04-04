// Packages:
import { pool } from '../../config/db'

// Functions:
/**
 * Adds reputation points to all users in the given ID list (batch update).
 *
 * @param userIds - Reporter user IDs to credit.
 * @param points - Points to add per user (e.g. 5 for account.muted).
 */
const awardReputationToReporters = async (userIds: number[], points: number): Promise<void> => {
  if (userIds.length === 0) return
  await pool.query(
    `
      UPDATE users
      SET
        reputation_points = reputation_points + $2,
        updated_at = NOW()
      WHERE id = ANY($1::int[])
    `,
    [userIds, points],
  )
}

/**
 * Increments successful_reports_count for each user in the list (batch update).
 *
 * @param userIds - Reporter user IDs whose successful report count should increase.
 */
const incrementSuccessfulReports = async (userIds: number[]): Promise<void> => {
  if (userIds.length === 0) return
  await pool.query(
    `
      UPDATE users
      SET
        successful_reports_count = successful_reports_count + 1,
        updated_at = NOW()
      WHERE id = ANY($1::int[])
    `,
    [userIds],
  )
}

// Exports:
export { awardReputationToReporters, incrementSuccessfulReports }
