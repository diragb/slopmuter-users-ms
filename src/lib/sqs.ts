// Packages:
import { SQSClient } from '@aws-sdk/client-sqs'

// Constants:
import { env } from '../config/env'

// Exports:
export const sqsClient = new SQSClient({ region: env.awsRegion })
