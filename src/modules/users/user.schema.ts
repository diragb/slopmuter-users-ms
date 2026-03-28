// Packages:
import zod from 'zod'

// Constants:
const updateProfileSchema = zod.object({
  name: zod.string().max(100, 'Name must be 100 characters or fewer').nullable().optional(),
  twitterUsername: zod
    .string()
    .max(15, 'Twitter username must be 15 characters or fewer')
    .regex(/^[a-zA-Z0-9_]+$/, 'Twitter username can only contain letters, numbers, and underscores')
    .nullable()
    .optional(),
})

// Exports:
export { updateProfileSchema }
