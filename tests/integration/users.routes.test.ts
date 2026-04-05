// Packages:
import { vi } from 'vitest'
import request from 'supertest'
import { startTestDatabase, stopTestDatabase, cleanTables, getTestPool } from '../setup/test-db'
import { signTestAccessToken } from '../helpers/test-jwt'

// Typescript:
import type { Pool } from 'pg'
import type { Application } from 'express'

// Mocks:
const dbRef = vi.hoisted(() => ({ pool: null as Pool | null }))

vi.mock('../../src/config/db', () => ({
  get pool() {
    return dbRef.pool
  },
}))

vi.mock('../../src/config/redis', () => ({
  default: {
    connect: vi.fn(),
    quit: vi.fn(),
    disconnect: vi.fn(),
    call: vi.fn().mockResolvedValue('OK'),
  },
}))

vi.mock('../../src/middleware/rate-limiter', () => ({
  globalLimiter: (_req: unknown, _res: unknown, next: () => void) => {
    next()
  },
}))

// Helpers:
const insertTestUser = async (
  pool: Pool,
  opts: { tier?: 'free' | 'pro'; twitter?: string | null; email?: string } = {},
) => {
  const email = opts.email ?? `user-${Date.now()}@example.com`
  const tier = opts.tier ?? 'free'
  const res = await pool.query<{ id: string }>(
    `INSERT INTO users (email, name, auth_provider, provider_user_id, subscription_tier, twitter_username)
     VALUES ($1, $2, 'google', $3, $4::subscription_tier, $5)
     RETURNING id`,
    [email, 'Test User', `prov-${Date.now()}-${Math.random()}`, tier, opts.twitter ?? null],
  )
  return { id: Number(res.rows[0]?.id), email }
}

// Tests:
describe('users routes', () => {
  let app: Application = null as unknown as Application

  beforeAll(async () => {
    dbRef.pool = await startTestDatabase()
    const appModule = await import('../../src/app')
    app = appModule.default
  })

  afterAll(async () => {
    await stopTestDatabase()
  })

  beforeEach(async () => {
    await cleanTables()
  })

  it('GET /v1/users/me returns 401 without JWT', async () => {
    const res = await request(app).get('/v1/users/me')

    expect(res.status).toBe(401)
    expect(res.body.error?.code).toBeDefined()
  })

  it('GET /v1/users/me returns user profile with valid JWT', async () => {
    const pool = getTestPool()
    if (!pool) throw new Error('Test pool not ready')
    const { id, email } = await insertTestUser(pool)
    const token = signTestAccessToken(id, email)

    const res = await request(app).get('/v1/users/me').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(id)
    expect(res.body.email).toBe(email)
    expect(res.body.categoryMask).toBe('0')
    expect(res.body.muteOnTwitterDefault).toBe(true)
  })

  it('PATCH /v1/users/me updates twitter_username', async () => {
    const pool = getTestPool()
    if (!pool) throw new Error('Test pool not ready')
    const { id, email } = await insertTestUser(pool, { twitter: null })
    const token = signTestAccessToken(id, email)

    const res = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({ twitterUsername: 'newhandle' })

    expect(res.status).toBe(200)
    expect(res.body.twitterUsername).toBe('newhandle')

    const row = await pool.query('SELECT twitter_username FROM users WHERE id = $1', [id])
    expect(row.rows[0].twitter_username).toBe('newhandle')
  })

  it('PATCH /v1/users/me rejects invalid twitter_username', async () => {
    const pool = getTestPool()
    if (!pool) throw new Error('Test pool not ready')
    const { id, email } = await insertTestUser(pool)
    const token = signTestAccessToken(id, email)

    const res = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({ twitterUsername: 'bad!' })

    expect(res.status).toBe(400)
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('DELETE /v1/users/me returns 204 and user is gone', async () => {
    const pool = getTestPool()
    if (!pool) throw new Error('Test pool not ready')
    const { id, email } = await insertTestUser(pool)
    const token = signTestAccessToken(id, email)

    const del = await request(app).delete('/v1/users/me').set('Authorization', `Bearer ${token}`)

    expect(del.status).toBe(204)

    const row = await pool.query('SELECT 1 FROM users WHERE id = $1', [id])
    expect(row.rowCount).toBe(0)

    const me = await request(app).get('/v1/users/me').set('Authorization', `Bearer ${token}`)

    expect(me.status).toBe(404)
  })

  it('GET /v1/users/me/export returns full data', async () => {
    const pool = getTestPool()
    if (!pool) throw new Error('Test pool not ready')
    const { id, email } = await insertTestUser(pool)
    const token = signTestAccessToken(id, email)

    const res = await request(app).get('/v1/users/me/export').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.profile).toMatchObject({ id, email })
    expect(res.body.preferences).toMatchObject({
      categoryMask: '0',
      muteOnTwitterDefault: true,
      notifyOnReportMutedTarget: true,
    })
    expect(res.body.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('PUT /v1/users/me/preferences enforces free-tier category limit', async () => {
    const pool = getTestPool()
    if (!pool) throw new Error('Test pool not ready')
    const { id, email } = await insertTestUser(pool, { tier: 'free' })
    const token = signTestAccessToken(id, email)

    const res = await request(app)
      .put('/v1/users/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({ categoryMask: 15, muteOnTwitterDefault: true })

    expect(res.status).toBe(403)
    expect(res.body.error?.code).toBe('CATEGORY_LIMIT_EXCEEDED')
  })

  it('GET /v1/users/me/stats returns 403 for free users', async () => {
    const pool = getTestPool()
    if (!pool) throw new Error('Test pool not ready')
    const { id, email } = await insertTestUser(pool, { tier: 'free' })
    const token = signTestAccessToken(id, email)

    const res = await request(app).get('/v1/users/me/stats').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error?.code).toBe('PRO_TIER_REQUIRED')
  })

  it('GET /v1/users/me/stats returns 200 for pro users', async () => {
    const pool = getTestPool()
    if (!pool) throw new Error('Test pool not ready')
    const { id, email } = await insertTestUser(pool, { tier: 'pro' })
    const token = signTestAccessToken(id, email)

    const res = await request(app).get('/v1/users/me/stats').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(id)
    expect(res.body.accuracy).toBeNull()
    expect(res.body.accountsReportedCount).toBe(0)
  })
})
