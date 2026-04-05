// Packages:
import zod from 'zod'

// Constants:
const welcomeBodySchema = zod.object({
  email: zod.email(),
  name: zod.string().nullable().optional(),
})

// Exports:
export { welcomeBodySchema }
