// Packages:
import { pool } from '../../config/db'

// Functions:
/**
 * Anonymizes all reports by setting the reporter_user_id to NULL for the specified user.
 *
 * @param {number} userId - The ID of the user whose reports should be anonymized.
 * @returns {Promise<number>} The number of reports that were anonymized (updated).
 */
const anonymizeReportsForReporterUserId = async (userId: number): Promise<number> => {
  const result = await pool.query(
    `
      UPDATE reports
      SET reporter_user_id = NULL
      WHERE reporter_user_id = $1
    `,
    [userId],
  )
  return result.rowCount ?? 0
}

/**
 * Revokes all refresh tokens for a user by setting revoked_at to NOW()
 * for all their non-revoked refresh tokens.
 * This is performed before deleting the user for auditability.
 *
 * @param {number} userId - The ID of the user whose refresh tokens should be revoked.
 * @returns {Promise<number>} The number of refresh tokens that were revoked.
 */
const revokeAllRefreshTokensForUser = async (userId: number): Promise<number> => {
  const result = await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1
        AND revoked_at IS NULL
    `,
    [userId],
  )
  return result.rowCount ?? 0
}

// Exports:
export { anonymizeReportsForReporterUserId, revokeAllRefreshTokensForUser }
