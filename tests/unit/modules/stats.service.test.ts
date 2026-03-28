// Packages:
import { vi } from 'vitest'
import { getUserStats } from '../../../src/modules/stats/stats.service'
import { ForbiddenError, NotFoundError } from '../../../src/lib/errors'
import { findUserSubscriptionTierByUserId } from '../../../src/modules/users/user.repository'
import { findUserStatsByUserId } from '../../../src/modules/stats/stats.repository'
import { SubscriptionTier } from '../../../src/types'

// Mocks:
const mockFindTier = vi.mocked(findUserSubscriptionTierByUserId)
const mockFindStats = vi.mocked(findUserStatsByUserId)

vi.mock('../../../src/modules/users/user.repository', () => ({
  findUserProfileByUserId: vi.fn(),
  findUserSubscriptionTierByUserId: vi.fn(),
  updateUserProfile: vi.fn(),
  deleteUser: vi.fn(),
}))

vi.mock('../../../src/modules/stats/stats.repository', () => ({
  findUserStatsByUserId: vi.fn(),
}))

// Tests:
beforeEach(() => {
  vi.clearAllMocks()
})

const sampleStats = {
  id: 1,
  accountsReportedCount: 10,
  successfulReportsCount: 5,
  reputationPoints: 20,
  accuracy: 0.5,
  memberSince: '2026-01-01T00:00:00.000Z',
  lastReportAt: null as string | null,
}

describe('stats.service', () => {
  it('throws ForbiddenError when user is free tier', async () => {
    mockFindTier.mockResolvedValue(SubscriptionTier.Free)

    await expect(getUserStats(1)).rejects.toThrow(ForbiddenError)
    expect(mockFindStats).not.toHaveBeenCalled()
  })

  it('returns stats when user is pro tier', async () => {
    mockFindTier.mockResolvedValue(SubscriptionTier.Pro)
    mockFindStats.mockResolvedValue(sampleStats)

    const result = await getUserStats(1)

    expect(result).toEqual(sampleStats)
    expect(mockFindStats).toHaveBeenCalledWith(1)
  })

  it('throws NotFoundError when user does not exist', async () => {
    mockFindTier.mockResolvedValue(null)

    await expect(getUserStats(999)).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when stats row missing for pro user', async () => {
    mockFindTier.mockResolvedValue(SubscriptionTier.Pro)
    mockFindStats.mockResolvedValue(null)

    await expect(getUserStats(1)).rejects.toThrow(NotFoundError)
  })
})
