// Packages:
import { DeleteMessageCommand, ReceiveMessageCommand, type Message } from '@aws-sdk/client-sqs'
import logger from '../../lib/logger'
import { sqsClient } from '../../lib/sqs'
import { sendAppealStatusUpdateEmail, sendReportMutedTargetEmail } from '../email/email.service'
import { awardReputationToReporters, incrementSuccessfulReports } from '../reputation/reputation.repository'
import { findReporterEmailsOptedInForMutedTargetNotification, updateSubscriptionTier } from '../users/user.repository'

// Constants:
import { env } from '../../config/env'

// Typescript:
import { SubscriptionTier } from '../../types'
import type { AccountMutedEvent, AppealResolvedEvent, SubscriptionChangedEvent } from '../../types/sqs-events'

// Functions:
const getCorrelationId = (message: Message, bodyCorrelationId?: string): string | undefined => {
  const attr = message.MessageAttributes?.['X-Correlation-ID']
  if (attr?.StringValue) return attr.StringValue
  return bodyCorrelationId
}

const parseSubscriptionTier = (value: unknown): SubscriptionTier | null => {
  if (value === SubscriptionTier.Free || value === SubscriptionTier.Pro) return value
  if (value === 'free') return SubscriptionTier.Free
  if (value === 'pro') return SubscriptionTier.Pro
  return null
}

const startAccountMutedConsumer = async (): Promise<void> => {
  for (;;) {
    const response = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: env.sqsAccountMutedQueueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ['All'],
      }),
    )

    for (const message of response.Messages ?? []) {
      const body = message.Body
      const receiptHandle = message.ReceiptHandle
      if (!body || !receiptHandle) {
        logger.warn({ messageId: message.MessageId }, 'SQS message missing body or receipt handle')
        continue
      }

      try {
        const parsed = JSON.parse(body) as Record<string, unknown>
        const correlationId = getCorrelationId(
          message,
          typeof parsed['correlationId'] === 'string' ? parsed['correlationId'] : undefined,
        )
        if (parsed['type'] !== 'account.muted') {
          logger.error(
            { messageId: message.MessageId, correlationId, receivedType: parsed['type'] },
            'Unexpected SQS event type for account.muted queue',
          )
          continue
        }

        const event = parsed as unknown as AccountMutedEvent
        await awardReputationToReporters(event.reporterUserIds, 5)
        await incrementSuccessfulReports(event.reporterUserIds)

        const reporterEmails = await findReporterEmailsOptedInForMutedTargetNotification(event.reporterUserIds)
        await Promise.all(
          reporterEmails.map(({ email }) =>
            sendReportMutedTargetEmail({ to: email, targetUsername: event.targetUsername }),
          ),
        )

        logger.info(
          {
            correlationId,
            messageId: message.MessageId,
            mutedAccountId: event.mutedAccountId,
            reporterCount: event.reporterUserIds.length,
          },
          'Processed account.muted',
        )

        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: env.sqsAccountMutedQueueUrl,
            ReceiptHandle: receiptHandle,
          }),
        )
      } catch (err) {
        logger.error({ err, messageId: message.MessageId }, 'Failed to process account.muted')
      }
    }
  }
}

const startAppealResolvedConsumer = async (): Promise<void> => {
  for (;;) {
    const response = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: env.sqsAppealResolvedQueueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ['All'],
      }),
    )

    for (const message of response.Messages ?? []) {
      const body = message.Body
      const receiptHandle = message.ReceiptHandle
      if (!body || !receiptHandle) {
        logger.warn({ messageId: message.MessageId }, 'SQS message missing body or receipt handle')
        continue
      }

      try {
        const parsed = JSON.parse(body) as Record<string, unknown>
        const correlationId = getCorrelationId(
          message,
          typeof parsed['correlationId'] === 'string' ? parsed['correlationId'] : undefined,
        )
        if (parsed['type'] !== 'appeal.resolved') {
          logger.error(
            { messageId: message.MessageId, correlationId, receivedType: parsed['type'] },
            'Unexpected SQS event type for appeal.resolved queue',
          )
          continue
        }

        const event = parsed as unknown as AppealResolvedEvent
        await sendAppealStatusUpdateEmail({
          to: event.appellantEmail,
          status: event.status,
          appealId: event.appealId,
        })
        logger.info(
          {
            correlationId,
            messageId: message.MessageId,
            appealId: event.appealId,
            status: event.status,
            appellantEmail: event.appellantEmail,
          },
          'Processed appeal.resolved',
        )

        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: env.sqsAppealResolvedQueueUrl,
            ReceiptHandle: receiptHandle,
          }),
        )
      } catch (err) {
        logger.error({ err, messageId: message.MessageId }, 'Failed to process appeal.resolved')
      }
    }
  }
}

const startSubscriptionChangedConsumer = async (): Promise<void> => {
  for (;;) {
    const response = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: env.sqsSubscriptionChangedQueueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ['All'],
      }),
    )

    for (const message of response.Messages ?? []) {
      const body = message.Body
      const receiptHandle = message.ReceiptHandle
      if (!body || !receiptHandle) {
        logger.warn({ messageId: message.MessageId }, 'SQS message missing body or receipt handle')
        continue
      }

      try {
        const parsed = JSON.parse(body) as Record<string, unknown>
        const correlationId = getCorrelationId(
          message,
          typeof parsed['correlationId'] === 'string' ? parsed['correlationId'] : undefined,
        )
        if (parsed['type'] !== 'subscription.changed') {
          logger.error(
            { messageId: message.MessageId, correlationId, receivedType: parsed['type'] },
            'Unexpected SQS event type for subscription.changed queue',
          )
          continue
        }

        const raw = parsed as unknown as SubscriptionChangedEvent
        const newTier = parseSubscriptionTier(raw.newTier)
        if (newTier === null) {
          logger.error(
            { messageId: message.MessageId, correlationId, newTier: raw.newTier },
            'Invalid newTier in subscription.changed',
          )
          continue
        }

        const updated = await updateSubscriptionTier(raw.userId, newTier)
        if (updated === 0) {
          logger.warn(
            { correlationId, messageId: message.MessageId, userId: raw.userId },
            'subscription.changed: user not found',
          )
        } else {
          logger.info(
            { correlationId, messageId: message.MessageId, userId: raw.userId, newTier },
            'Processed subscription.changed',
          )
        }

        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: env.sqsSubscriptionChangedQueueUrl,
            ReceiptHandle: receiptHandle,
          }),
        )
      } catch (err) {
        logger.error({ err, messageId: message.MessageId }, 'Failed to process subscription.changed')
      }
    }
  }
}

/**
 * Starts three long-polling SQS consumers in parallel (same process as HTTP server).
 */
const startSqsConsumers = (): void => {
  void startAccountMutedConsumer().catch(err => {
    logger.fatal({ err }, 'account.muted SQS consumer exited')
    process.exit(1)
  })
  void startAppealResolvedConsumer().catch(err => {
    logger.fatal({ err }, 'appeal.resolved SQS consumer exited')
    process.exit(1)
  })
  void startSubscriptionChangedConsumer().catch(err => {
    logger.fatal({ err }, 'subscription.changed SQS consumer exited')
    process.exit(1)
  })
}

// Exports:
export { startSqsConsumers }
