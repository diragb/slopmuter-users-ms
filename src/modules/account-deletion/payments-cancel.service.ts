// Constants:
import { env } from '../../config/env'
import logger from '../../lib/logger'

// Functions:
// TODO: This will probably be reworked later on.
/**
 * Best-effort subscription cancellation via Payments microservice.
 * Expects: POST {base}/internal/users/:userId/subscription/cancel with optional X-Internal-Secret.
 * Skips when PAYMENTS_SERVICE_BASE_URL is unset.
 *
 * @param {number} userId - The ID of the user whose subscriptions should be cancelled.
 * @returns {Promise<void>}
 */
const cancelSubscriptionsForUser = async (userId: number): Promise<void> => {
  const base = env.paymentsServiceBaseUrl
  if (!base) {
    logger.debug({ userId }, 'PAYMENTS_SERVICE_BASE_URL not set; skipping subscription cancel')
    return
  }

  const url = `${base.replace(/\/$/, '')}/internal/users/${userId}/subscription/cancel`

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (env.paymentsInternalSecret) {
      headers['X-Internal-Secret'] = env.paymentsInternalSecret
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!response.ok) {
      logger.warn(
        { userId, status: response.status, url },
        'Payments service subscription cancel returned non-OK; proceeding with account deletion',
      )
    } else {
      logger.info({ userId }, 'Requested subscription cancel via payments service')
    }
  } catch (err) {
    logger.error({ err, userId }, 'Payments service subscription cancel failed; proceeding with account deletion')
  }
}

// Exports:
export { cancelSubscriptionsForUser }
