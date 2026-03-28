// Packages:
import { pool } from '../../config/db'

// Typescript:
import type { QueryResultRow } from 'pg'
import type { SubscriptionTier, UserProfile } from '../../types'

type UpdateUserProfileInput = Pick<UserProfile, 'name' | 'twitterUsername'>

// Functions:
/**
 * Maps a raw database row to a User object.
 *
 * @param row - Raw row from the database query result.
 * @returns A User object with properly typed fields.
 */
const mapUserProfileRow = (row: QueryResultRow): UserProfile => {
  return {
    id: row['id'],
    email: row['email'],
    name: row['name'],
    avatarUrl: row['avatarUrl'],
    twitterUsername: row['twitterUsername'],
    subscriptionTier: row['subscriptionTier'],
  }
}

/**
 * Finds a user profile by their internal ID.
 *
 * @param userId - The internal user ID to look up.
 * @returns The matching user profile, or null if not found.
 */
const findUserProfileByUserId = async (userId: number): Promise<UserProfile | null> => {
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        name,
        avatar_url AS "avatarUrl",
        twitter_username AS "twitterUsername",
        subscription_tier AS "subscriptionTier"
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  )

  if (result.rowCount === 0) return null
  return mapUserProfileRow(result.rows[0])
}

/**
 * Retrieves the subscription tier for a user by their internal user ID.
 *
 * @param userId - The internal user ID whose subscription tier should be fetched.
 * @returns The user's SubscriptionTier if found, or null if the user does not exist.
 */
const findUserSubscriptionTierByUserId = async (userId: number): Promise<SubscriptionTier | null> => {
  const result = await pool.query(
    `
      SELECT subscription_tier AS "subscriptionTier"
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  )

  if (result.rowCount === 0) return null
  return result.rows[0].subscriptionTier as SubscriptionTier
}

/**
 * Updates a user's profile with editable fields and returns the updated user profile.
 *
 * @param userId - The internal user ID whose profile is to be updated.
 * @param editableUserProfileFields - Object containing editable fields (`name`, `twitterUsername`).
 * @returns The updated user profile, or null if no user was found for the given ID.
 */
const updateUserProfile = async (userId: number, input: UpdateUserProfileInput): Promise<UserProfile | null> => {
  const result = await pool.query(
    `
      UPDATE users
      SET
        name = $2,
        twitter_username = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        email,
        name,
        avatar_url AS "avatarUrl",
        twitter_username AS "twitterUsername",
        subscription_tier AS "subscriptionTier"
    `,
    [userId, input.name, input.twitterUsername],
  )

  if (result.rowCount === 0) return null
  return mapUserProfileRow(result.rows[0])
}

/**
 * Deletes a user from the database by their internal user ID.
 *
 * @param userId - The internal user ID to delete.
 * @returns void
 */
const deleteUser = async (userId: number): Promise<void> => {
  await pool.query(
    `
      DELETE FROM users WHERE id = $1
    `,
    [userId],
  )
}

/**
 * Updates the user's last active timestamp to the current time.
 *
 * @param userId - The internal user ID to touch.
 * @returns void
 */
const touchLastActive = async (userId: number): Promise<void> => {
  await pool.query(
    `
      UPDATE users
      SET last_active_at = NOW()
      WHERE id = $1
    `,
    [userId],
  )
}

// Exports:
export { findUserProfileByUserId, findUserSubscriptionTierByUserId, updateUserProfile, deleteUser, touchLastActive }
export type { UpdateUserProfileInput }
