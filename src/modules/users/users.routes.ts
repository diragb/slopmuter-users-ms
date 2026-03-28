// Packages:
import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import validateRequest from '../../middleware/request-handler'
import { getProfile, patchProfile, deleteProfile, getExport } from './users.controller'
import { getMyPreferences, putMyPreferences } from '../preferences/preferences.controller'
import { getMyStats } from '../stats/stats.controller'
import { updateProfileSchema } from './user.schema'
import { updatePreferencesSchema } from '../preferences/preferences.schema'

// Constants:
const usersRouter = Router()
usersRouter.use(requireAuth)

// Routes:
usersRouter.get('/me', getProfile)
usersRouter.patch('/me', validateRequest(updateProfileSchema), patchProfile)
usersRouter.delete('/me', deleteProfile)
usersRouter.get('/me/export', getExport)
usersRouter.get('/me/preferences', getMyPreferences)
usersRouter.put('/me/preferences', validateRequest(updatePreferencesSchema), putMyPreferences)
usersRouter.get('/me/stats', getMyStats)

// Exports:
export default usersRouter
