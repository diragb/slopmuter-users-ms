// Packages:
import {
  deleteUser,
  findUserProfileByUserId,
  updateUserProfile as updateUserProfileRepository,
} from './user.repository'
import {
  anonymizeReportsForReporterUserId,
  revokeAllRefreshTokensForUser,
} from '../account-deletion/account-deletion.repository'
import { cancelSubscriptionsForUser } from '../account-deletion/payments-cancel.service'
import { sendAccountDeletionConfirmationEmail } from '../email/email.service'
import { NotFoundError } from '../../lib/errors'
import logger from '../../lib/logger'
import { findPreferencesByUserId } from '../preferences/preferences.repository'
import { findReportsByReporterUserId } from '../report/report.repository'

// Constants:
import { DEFAULT_USER_PREFERENCES } from '../preferences/preferences.constants'

// Typescript:
import type { UpdateUserProfileInput } from './user.repository'
import type { UserFullProfile } from '../../types'

// Functions:
/**
 * Loads the signed-in user's profile merged with preferences for `GET /v1/users/me`.
 * When no `user_preferences` row exists, preference fields come from server defaults (`DEFAULT_USER_PREFERENCES`).
 *
 * @param userId - Internal user id from auth.
 * @returns Profile plus `categoryMask`, `muteOnTwitterDefault`, `notifyOnReportMutedTarget`, and `updatedAt` when prefs exist.
 * @throws {NotFoundError} When the user row is missing (`USER_NOT_FOUND`).
 */
const getUserFullProfile = async (userId: number): Promise<UserFullProfile> => {
  const userProfile = await findUserProfileByUserId(userId)
  if (!userProfile) throw new NotFoundError('USER_NOT_FOUND', 'User profile not found.')

  const userPreferences = await findPreferencesByUserId(userId)
  if (!userPreferences) {
    return { ...userProfile, ...DEFAULT_USER_PREFERENCES }
  }

  return {
    ...userProfile,
    categoryMask: userPreferences.categoryMask,
    muteOnTwitterDefault: userPreferences.muteOnTwitterDefault,
    updatedAt: userPreferences.updatedAt,
  }
}

/**
 * Applies optional profile updates for `PATCH /v1/users/me` (e.g. `twitterUsername`, `name`).
 * OAuth-sourced identity fields (such as email) are not updated here.
 *
 * @param userId - Internal user id from auth.
 * @param input - Allowed patch fields from the users repository layer.
 * @returns The updated user profile row (`UserProfile` shape).
 * @throws {NotFoundError} When the user row is missing after update (`USER_NOT_FOUND`).
 */
const updateUserProfile = async (userId: number, input: UpdateUserProfileInput) => {
  const userProfile = await updateUserProfileRepository(userId, input)
  if (!userProfile) throw new NotFoundError('USER_NOT_FOUND', 'User profile not found.')

  return userProfile
}

/**
 * Builds the GDPR portability JSON for `GET /v1/users/me/export`: signed-in user's data as a snapshot.
 * Includes `profile` (id, email, name, avatarUrl, twitterUsername, subscriptionTier), `preferences`
 * (`categoryMask` as string, `muteOnTwitterDefault`, plus other stored preference fields), `reports`
 * (all non-anonymized reports filed by this user), and `exportedAt` (ISO 8601). Subscription billing
 * details are not included yet (see product spec).
 *
 * @param userId - Internal user id from auth.
 * @returns Portable export payload for JSON serialization.
 * @throws {NotFoundError} When the user profile row is missing (`USER_NOT_FOUND`).
 */
const exportUserData = async (userId: number) => {
  const userProfile = await findUserProfileByUserId(userId)
  if (!userProfile) throw new NotFoundError('USER_NOT_FOUND', 'User profile not found.')

  const userPreferences = await findPreferencesByUserId(userId)
  const reports = await findReportsByReporterUserId(userId)

  return {
    profile: userProfile,
    preferences: userPreferences ?? DEFAULT_USER_PREFERENCES,
    reports,
    exportedAt: new Date().toISOString(),
  }
}

/**
 * Executes full account deletion for `DELETE /v1/users/me` (GDPR right to erasure): cancels Stripe
 * subscriptions, sends the account-deleted confirmation email when a profile exists, anonymizes the
 * user's filed reports (`reporter_user_id` cleared), revokes refresh tokens, then deletes the user
 * row (CASCADE cleans dependent data such as preferences).
 *
 * @param userId - Internal user id from auth.
 */
const deleteAccount = async (userId: number) => {
  const userProfile = await findUserProfileByUserId(userId)

  await cancelSubscriptionsForUser(userId)

  if (userProfile) {
    await sendAccountDeletionConfirmationEmail({ to: userProfile.email, name: userProfile.name })
  }

  const reportsAnonymized = await anonymizeReportsForReporterUserId(userId)
  const tokensRevoked = await revokeAllRefreshTokensForUser(userId)
  logger.info(
    { userId, reportsAnonymized, tokensRevoked },
    'Account deletion: anonymized reports and revoked refresh tokens',
  )

  await deleteUser(userId)
}

// Exports:
export { getUserFullProfile, updateUserProfile, exportUserData, deleteAccount }
