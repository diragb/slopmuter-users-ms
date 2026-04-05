// Packages:
import { vi } from 'vitest'

vi.mock('../../../src/modules/email/email.service', () => ({
  sendAccountDeletionConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/modules/account-deletion/account-deletion.repository', () => ({
  anonymizeReportsForReporterUserId: vi.fn().mockResolvedValue(0),
  revokeAllRefreshTokensForUser: vi.fn().mockResolvedValue(0),
}))

vi.mock('../../../src/modules/account-deletion/payments-cancel.service', () => ({
  cancelSubscriptionsForUser: vi.fn().mockResolvedValue(undefined),
}))

import {
  getUserFullProfile,
  updateUserProfile,
  exportUserData,
  deleteAccount,
} from '../../../src/modules/users/users.service'
import {
  anonymizeReportsForReporterUserId,
  revokeAllRefreshTokensForUser,
} from '../../../src/modules/account-deletion/account-deletion.repository'
import { cancelSubscriptionsForUser } from '../../../src/modules/account-deletion/payments-cancel.service'
import { sendAccountDeletionConfirmationEmail } from '../../../src/modules/email/email.service'
import { NotFoundError } from '../../../src/lib/errors'
import {
  deleteUser,
  findUserProfileByUserId,
  updateUserProfile as updateUserProfileRepository,
} from '../../../src/modules/users/user.repository'
import { findPreferencesByUserId } from '../../../src/modules/preferences/preferences.repository'
import { SubscriptionTier } from '../../../src/types'

// Mocks:
const mockFindUserProfile = vi.mocked(findUserProfileByUserId)
const mockFindPreferences = vi.mocked(findPreferencesByUserId)
const mockUpdateUserProfileRepository = vi.mocked(updateUserProfileRepository)
const mockDeleteUser = vi.mocked(deleteUser)
const mockSendDeletionEmail = vi.mocked(sendAccountDeletionConfirmationEmail)
const mockCancelSubscriptions = vi.mocked(cancelSubscriptionsForUser)
const mockAnonymizeReports = vi.mocked(anonymizeReportsForReporterUserId)
const mockRevokeTokens = vi.mocked(revokeAllRefreshTokensForUser)

vi.mock('../../../src/modules/users/user.repository', () => ({
  deleteUser: vi.fn(),
  findUserProfileByUserId: vi.fn(),
  findUserSubscriptionTierByUserId: vi.fn(),
  updateUserProfile: vi.fn(),
}))

vi.mock('../../../src/modules/preferences/preferences.repository', () => ({
  findPreferencesByUserId: vi.fn(),
  upsertPreferences: vi.fn(),
}))

// Tests:
beforeEach(() => {
  vi.clearAllMocks()
})

const sampleProfile = {
  id: 1,
  email: 'a@example.com',
  name: 'Alice',
  avatarUrl: null as string | null,
  twitterUsername: null as string | null,
  subscriptionTier: SubscriptionTier.Free,
}

describe('users.service', () => {
  describe('getUserFullProfile', () => {
    it('returns profile with preferences when user and prefs exist', async () => {
      mockFindUserProfile.mockResolvedValue(sampleProfile)
      mockFindPreferences.mockResolvedValue({
        categoryMask: '7',
        muteOnTwitterDefault: false,
        notifyOnReportMutedTarget: true,
        updatedAt: '2026-01-01T00:00:00.000Z',
      })

      const result = await getUserFullProfile(1)

      expect(result).toMatchObject({
        id: 1,
        email: 'a@example.com',
        categoryMask: '7',
        muteOnTwitterDefault: false,
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
      expect(mockFindUserProfile).toHaveBeenCalledWith(1)
      expect(mockFindPreferences).toHaveBeenCalledWith(1)
    })

    it('returns profile with default preferences when no prefs row', async () => {
      mockFindUserProfile.mockResolvedValue(sampleProfile)
      mockFindPreferences.mockResolvedValue(null)

      const result = await getUserFullProfile(1)

      expect(result).toMatchObject({
        id: 1,
        categoryMask: '0',
        muteOnTwitterDefault: true,
        notifyOnReportMutedTarget: true,
      })
      expect(result.updatedAt).toBeUndefined()
    })

    it('throws NotFoundError when user does not exist', async () => {
      mockFindUserProfile.mockResolvedValue(null)

      await expect(getUserFullProfile(99)).rejects.toThrow(NotFoundError)
      expect(mockFindPreferences).not.toHaveBeenCalled()
    })
  })

  describe('updateUserProfile', () => {
    it('returns updated profile when repository succeeds', async () => {
      const updated = { ...sampleProfile, twitterUsername: 'alice_x' }
      mockUpdateUserProfileRepository.mockResolvedValue(updated)

      const result = await updateUserProfile(1, { name: 'Alice', twitterUsername: 'alice_x' })

      expect(result).toEqual(updated)
      expect(mockUpdateUserProfileRepository).toHaveBeenCalledWith(1, {
        name: 'Alice',
        twitterUsername: 'alice_x',
      })
    })

    it('throws NotFoundError when repository returns null', async () => {
      mockUpdateUserProfileRepository.mockResolvedValue(null)

      await expect(updateUserProfile(1, { name: null, twitterUsername: null })).rejects.toThrow(NotFoundError)
    })
  })

  describe('exportUserData', () => {
    it('returns profile, preferences, and exportedAt', async () => {
      mockFindUserProfile.mockResolvedValue(sampleProfile)
      mockFindPreferences.mockResolvedValue({
        categoryMask: '3',
        muteOnTwitterDefault: true,
        notifyOnReportMutedTarget: true,
        updatedAt: '2026-01-02T00:00:00.000Z',
      })

      const result = await exportUserData(1)

      expect(result.profile).toEqual(sampleProfile)
      expect(result.preferences).toMatchObject({
        categoryMask: '3',
        muteOnTwitterDefault: true,
        notifyOnReportMutedTarget: true,
      })
      expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('throws NotFoundError when user does not exist', async () => {
      mockFindUserProfile.mockResolvedValue(null)

      await expect(exportUserData(1)).rejects.toThrow(NotFoundError)
    })
  })

  describe('deleteAccount', () => {
    it('cancels subscriptions, emails, anonymizes reports, revokes tokens, then deletes user', async () => {
      mockFindUserProfile.mockResolvedValue(sampleProfile)
      mockDeleteUser.mockResolvedValue(undefined)
      mockAnonymizeReports.mockResolvedValue(2)
      mockRevokeTokens.mockResolvedValue(1)

      await deleteAccount(42)

      expect(mockCancelSubscriptions).toHaveBeenCalledWith(42)
      expect(mockSendDeletionEmail).toHaveBeenCalledWith({
        to: sampleProfile.email,
        name: sampleProfile.name,
      })
      expect(mockAnonymizeReports).toHaveBeenCalledWith(42)
      expect(mockRevokeTokens).toHaveBeenCalledWith(42)
      expect(mockDeleteUser).toHaveBeenCalledWith(42)
    })
  })
})
