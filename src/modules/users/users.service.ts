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

// Constants:
import { DEFAULT_USER_PREFERENCES } from '../preferences/preferences.constants'

// Typescript:
import type { UpdateUserProfileInput } from './user.repository'
import type { UserFullProfile } from '../../types'

// Functions:
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

const updateUserProfile = async (userId: number, input: UpdateUserProfileInput) => {
  const userProfile = await updateUserProfileRepository(userId, input)
  if (!userProfile) throw new NotFoundError('USER_NOT_FOUND', 'User profile not found.')

  return userProfile
}

const exportUserData = async (userId: number) => {
  const userProfile = await findUserProfileByUserId(userId)
  if (!userProfile) throw new NotFoundError('USER_NOT_FOUND', 'User profile not found.')

  const userPreferences = await findPreferencesByUserId(userId)

  return {
    profile: userProfile,
    preferences: userPreferences ?? DEFAULT_USER_PREFERENCES,
    exportedAt: new Date().toISOString(),
  }
}

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
