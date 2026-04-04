// Typescript:
import type { SubscriptionTier } from './index'

// Exports:
export interface AccountMutedEvent {
  type: 'account.muted'
  mutedAccountId: number
  targetUsername: string
  offenseNumber: number
  reporterUserIds: number[]
  correlationId: string
}

export interface AppealResolvedEvent {
  type: 'appeal.resolved'
  appealId: number
  mutedAccountId: number
  appellantEmail: string
  status: 'approved' | 'rejected'
  correlationId: string
}

export interface SubscriptionChangedEvent {
  type: 'subscription.changed'
  userId: number
  previousTier: SubscriptionTier
  newTier: SubscriptionTier
  stripeSubscriptionId: string
  correlationId: string
}

export type UsersServiceInboundSqsEvent = AccountMutedEvent | AppealResolvedEvent | SubscriptionChangedEvent
