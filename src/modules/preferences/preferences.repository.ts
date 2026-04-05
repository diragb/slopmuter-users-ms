// Packages:
import { pool } from '../../config/db'

// Typescript:
import type { QueryResultRow } from 'pg'
import type { UserPreferences } from '../../types'

interface UpsertUserPreferencesInput {
  categoryMask: number
  muteOnTwitterDefault?: boolean
  notifyOnReportMutedTarget?: boolean
}

// Functions:
/**
 * Maps a raw database row to a UserPreferences object.
 *
 * @param row - Raw row from the database query result.
 * @returns A UserPreferences object with properly typed fields.
 */
const mapUserPreferencesRow = (row: QueryResultRow): UserPreferences => {
  const updatedAt = row['updatedAt']
  return {
    categoryMask: String(row['categoryMask']),
    muteOnTwitterDefault: Boolean(row['muteOnTwitterDefault']),
    notifyOnReportMutedTarget:
      row['notifyOnReportMutedTarget'] === undefined ? true : Boolean(row['notifyOnReportMutedTarget']),
    updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt),
  }
}

/**
 * Fetches user preferences by user ID.
 *
 * @param userId - The ID of the user whose preferences to retrieve.
 * @returns The user preferences if found, or null if no preferences exist for the user.
 */
const findPreferencesByUserId = async (userId: number): Promise<UserPreferences | null> => {
  const result = await pool.query(
    `
      SELECT
        category_mask::text AS "categoryMask",
        mute_on_twitter_default AS "muteOnTwitterDefault",
        notify_on_report_muted_target AS "notifyOnReportMutedTarget",
        updated_at AS "updatedAt"
      FROM user_preferences
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  )

  if (result.rowCount === 0) return null
  return mapUserPreferencesRow(result.rows[0])
}

/**
 * Inserts or updates user preferences. Creates a new row if none exists for the user,
 * otherwise updates the existing row on conflict.
 *
 * @param userId - The ID of the user whose preferences to upsert.
 * @param data - The preferences to save (categoryMask and optional muteOnTwitterDefault).
 */
const upsertPreferences = async (userId: number, data: UpsertUserPreferencesInput): Promise<void> => {
  const notifyParam = data.notifyOnReportMutedTarget !== undefined ? data.notifyOnReportMutedTarget : null
  await pool.query(
    `
      INSERT INTO user_preferences (user_id, category_mask, mute_on_twitter_default, notify_on_report_muted_target, updated_at)
      VALUES ($1, $2, COALESCE($3, TRUE), COALESCE($4, TRUE), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        category_mask = EXCLUDED.category_mask,
        mute_on_twitter_default = COALESCE(EXCLUDED.mute_on_twitter_default, user_preferences.mute_on_twitter_default),
        notify_on_report_muted_target = COALESCE($4::boolean, user_preferences.notify_on_report_muted_target),
        updated_at = NOW()
    `,
    [userId, data.categoryMask, data.muteOnTwitterDefault ?? null, notifyParam],
  )
}

// Exports:
export { findPreferencesByUserId, upsertPreferences }
export type { UserPreferences, UpsertUserPreferencesInput }
