// Packages:
import { SESClient } from '@aws-sdk/client-ses'

// Constants:
import { env } from '../config/env'

// Exports:
export const sesClient = new SESClient({ region: env.sesRegion })
