// Packages:
import { findPreferencesByUserId, upsertPreferences } from './preferences.repository'
import { findUserSubscriptionTierByUserId } from '../users/user.repository'
import { ForbiddenError, NotFoundError } from '../../lib/errors'
import { popcount } from '../../lib/categories'

// Constants:
import { DEFAULT_USER_PREFERENCES } from './preferences.constants'

// Typescript:
import type { UpsertUserPreferencesInput } from './preferences.repository'
import { SubscriptionTier } from '../../types'

// Functions:
const getPreferences = async (userId: number) => {
  const preferences = await findPreferencesByUserId(userId)
  if (!preferences) return DEFAULT_USER_PREFERENCES
  return preferences
}

const updatePreferences = async (userId: number, input: UpsertUserPreferencesInput) => {
  const tier = await findUserSubscriptionTierByUserId(userId)
  if (!tier) throw new NotFoundError('USER_NOT_FOUND', 'User profile not found.')

  if (tier === SubscriptionTier.Free && popcount(input.categoryMask) > 3)
    throw new ForbiddenError('CATEGORY_LIMIT_EXCEEDED', 'Free tier allows up to 3 categories.')

  await upsertPreferences(userId, input)
  return findPreferencesByUserId(userId)
}

// Exports:
export { getPreferences, updatePreferences }
