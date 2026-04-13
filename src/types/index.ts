// Exports:
export enum SubscriptionTier {
  Free = 'free',
  Pro = 'pro',
}

export enum ReportStatus {
  PENDING = 'pending',
  COUNTED = 'counted',
  ENRICHMENT = 'enrichment',
  DISCARDED = 'discarded',
  EXPIRED = 'expired',
}

export interface Report {
  id: number
  targetUsernameHash: string
  targetUsername: string
  reporterUserId: number
  reporterRepAtTime: number
  categoryMask: string
  tweetUrl: string
  note?: string | null
  offenseNumber: number
  status: ReportStatus
  reportedAt: string
}

export interface UserProfile {
  id: number
  email: string
  name: string | null
  avatarUrl: string | null
  twitterUsername: string | null
  subscriptionTier: SubscriptionTier
}

export interface UserStats {
  id: number
  accountsReportedCount: number
  successfulReportsCount: number
  reputationPoints: number
  accuracy: number | null
  memberSince: string
  lastReportAt: string | null
}

export interface UserPreferences {
  categoryMask: string // BIGINT comes back as string from pg
  muteOnTwitterDefault: boolean
  notifyOnReportMutedTarget: boolean
  updatedAt: string
}

export interface UserFullProfile extends UserProfile, Partial<Omit<UserPreferences, 'id'>> {}
