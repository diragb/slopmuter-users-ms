// Packages:
import zod from 'zod'

// Constants:
const updatePreferencesSchema = zod.object({
  categoryMask: zod.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  muteOnTwitterDefault: zod.boolean().optional(),
})

// Exports:
export { updatePreferencesSchema }
