// Packages:
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'

// Typescript:
import type { UsersServiceInboundSqsEvent } from '../types/sqs-events'

// Constants:
import { env } from '../config/env'

const sqsClient = new SQSClient({ region: env.awsRegion })

const publishMessage = async (queueUrl: string, messageBody: UsersServiceInboundSqsEvent, correlationId?: string) => {
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(messageBody),
    MessageAttributes: correlationId
      ? {
          'X-Correlation-ID': { DataType: 'string', StringValue: correlationId },
        }
      : undefined,
  })

  await sqsClient.send(command)
}

// Exports:
export { sqsClient, publishMessage }
