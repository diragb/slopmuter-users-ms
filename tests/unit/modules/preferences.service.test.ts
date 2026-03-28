// Packages:
import { vi } from 'vitest'
import { getPreferences, updatePreferences } from '../../../src/modules/preferences/preferences.service'
import { ForbiddenError, NotFoundError } from '../../../src/lib/errors'
import { findPreferencesByUserId, upsertPreferences } from '../../../src/modules/preferences/preferences.repository'
import { findUserSubscriptionTierByUserId } from '../../../src/modules/users/user.repository'
import { SubscriptionTier } from '../../../src/types'

// Mocks:
const mockFindPreferences = vi.mocked(findPreferencesByUserId)
const mockUpsert = vi.mocked(upsertPreferences)
const mockFindTier = vi.mocked(findUserSubscriptionTierByUserId)

vi.mock('../../../src/modules/preferences/preferences.repository', () => ({
  findPreferencesByUserId: vi.fn(),
  upsertPreferences: vi.fn(),
}))

vi.mock('../../../src/modules/users/user.repository', () => ({
  findUserProfileByUserId: vi.fn(),
  findUserSubscriptionTierByUserId: vi.fn(),
  updateUserProfile: vi.fn(),
  deleteUser: vi.fn(),
}))

// Tests:
beforeEach(() => {
  vi.clearAllMocks()
})

const savedPrefs = {
  id: 1,
  categoryMask: '7',
  muteOnTwitterDefault: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('preferences.service', () => {
  describe('getPreferences', () => {
    it('returns stored preferences when row exists', async () => {
      mockFindPreferences.mockResolvedValue(savedPrefs)

      const result = await getPreferences(1)

      expect(result).toEqual(savedPrefs)
    })

    it('returns defaults when no row exists', async () => {
      mockFindPreferences.mockResolvedValue(null)

      const result = await getPreferences(1)

      expect(result).toEqual({ categoryMask: '0', muteOnTwitterDefault: true })
    })
  })

  describe('updatePreferences', () => {
    it('allows free user with at most 3 categories (mask 0b111)', async () => {
      mockFindTier.mockResolvedValue(SubscriptionTier.Free)
      mockUpsert.mockResolvedValue(undefined)
      mockFindPreferences.mockResolvedValue(savedPrefs)

      const result = await updatePreferences(1, { categoryMask: 7, muteOnTwitterDefault: true })

      expect(mockUpsert).toHaveBeenCalledWith(1, { categoryMask: 7, muteOnTwitterDefault: true })
      expect(result).toEqual(savedPrefs)
    })

    it('throws ForbiddenError when free user exceeds 3 categories', async () => {
      mockFindTier.mockResolvedValue(SubscriptionTier.Free)

      await expect(updatePreferences(1, { categoryMask: 15, muteOnTwitterDefault: true })).rejects.toThrow(
        ForbiddenError,
      )

      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('allows pro user with more than 3 categories', async () => {
      mockFindTier.mockResolvedValue(SubscriptionTier.Pro)
      mockUpsert.mockResolvedValue(undefined)
      mockFindPreferences.mockResolvedValue({
        ...savedPrefs,
        categoryMask: '15',
      })

      const result = await updatePreferences(1, { categoryMask: 15, muteOnTwitterDefault: false })

      expect(mockUpsert).toHaveBeenCalled()
      expect(result?.categoryMask).toBe('15')
    })

    it('throws NotFoundError when user tier cannot be resolved', async () => {
      mockFindTier.mockResolvedValue(null)

      await expect(updatePreferences(1, { categoryMask: 1, muteOnTwitterDefault: true })).rejects.toThrow(NotFoundError)
    })
  })
})
