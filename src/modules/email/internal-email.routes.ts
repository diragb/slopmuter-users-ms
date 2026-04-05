// Packages:
import { Router } from 'express'
import { postWelcomeEmail } from './email.routes'

// Constants:
const router = Router()

// Routes:
router.post('/welcome', postWelcomeEmail)

// Exports:
export default router
