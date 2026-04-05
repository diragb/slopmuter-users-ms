// Exports:
export enum SubscriptionTier {
  Free = 'free',
  Pro = 'pro',
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
