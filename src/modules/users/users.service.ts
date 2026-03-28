// Packages:
import {
  deleteUser,
  findUserProfileByUserId,
  updateUserProfile as updateUserProfileRepository,
} from './user.repository'
import { NotFoundError } from '../../lib/errors'
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
  await deleteUser(userId)
  // TODO: cancel Stripe subscription, anonymize reports, send confirmation email.
}

// Exports:
export { getUserFullProfile, updateUserProfile, exportUserData, deleteAccount }
