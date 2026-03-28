// Packages:
import { findUserSubscriptionTierByUserId } from '../users/user.repository'
import { ForbiddenError, NotFoundError } from '../../lib/errors'
import { findUserStatsByUserId } from './stats.repository'

// Typescript:
import { SubscriptionTier } from '../../types'

// Functions:
const getUserStats = async (userId: number) => {
  const subscriptionTier = await findUserSubscriptionTierByUserId(userId)
  if (!subscriptionTier) throw new NotFoundError('USER_NOT_FOUND', 'User profile not found.')
  if (subscriptionTier === SubscriptionTier.Free)
    throw new ForbiddenError('PRO_TIER_REQUIRED', 'This feature requires a Pro subscription.')

  const stats = await findUserStatsByUserId(userId)
  if (!stats) throw new NotFoundError('USER_NOT_FOUND', 'User profile not found.')

  return stats
}

// Exports:
export { getUserStats }
