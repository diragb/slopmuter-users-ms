// Packages:
import { welcomeBodySchema } from './email.schema'
import { sendWelcomeEmail } from './email.service'

// Typescript:
import type { Request, Response } from 'express'

// Constants:
import { env } from '../../config/env'

// Functions:
const postWelcomeEmail = async (req: Request, res: Response): Promise<void> => {
  if (!env.internalEmailSecret || req.get('x-internal-secret') !== env.internalEmailSecret) {
    res.status(403).json({ error: 'FORBIDDEN' })
    return
  }

  const parsed = welcomeBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY' })
    return
  }

  await sendWelcomeEmail({ to: parsed.data.email, name: parsed.data.name ?? null })
  res.status(204).send()
}

// Exports:
export { postWelcomeEmail }
