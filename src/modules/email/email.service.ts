// Packages:
import { SendEmailCommand } from '@aws-sdk/client-ses'

// Constants:
import { env } from '../../config/env'
import logger from '../../lib/logger'
import { sesClient } from '../../lib/ses'

// Typescript:
export type EmailTemplateId =
  | 'welcome'
  | 'appeal-status-update'
  | 'account-deletion-confirmation'
  | 'report-muted-target'

interface TemplatedMessage {
  template: EmailTemplateId
  subject: string
  textBody: string
  htmlBody: string
}

// Functions:
const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const buildWelcome = (name: string | null): TemplatedMessage => {
  const greeting = name?.trim() ? `Hi ${escapeHtml(name.trim())},` : 'Hi,'
  const textName = name?.trim() ? name.trim() : 'there'
  return {
    template: 'welcome',
    subject: 'Welcome to SlopMuter',
    textBody: `Hi ${textName},\n\nThanks for signing in. SlopMuter helps you filter low-signal and AI-generated noise on X.\n\n— SlopMuter`,
    htmlBody: `<p>${greeting}</p><p>Thanks for signing in. SlopMuter helps you filter low-signal and AI-generated noise on X.</p><p>— SlopMuter</p>`,
  }
}

const buildAccountDeletionConfirmation = (name: string | null): TemplatedMessage => {
  const greeting = name?.trim() ? `Hi ${escapeHtml(name.trim())},` : 'Hi,'
  const textName = name?.trim() ? name.trim() : 'there'
  return {
    template: 'account-deletion-confirmation',
    subject: 'Your SlopMuter account was deleted',
    textBody: `Hi ${textName},\n\nYour SlopMuter account and associated profile data have been deleted as requested.\n\n— SlopMuter`,
    htmlBody: `<p>${greeting}</p><p>Your SlopMuter account and associated profile data have been deleted as requested.</p><p>— SlopMuter</p>`,
  }
}

const buildAppealStatusUpdate = (input: { status: 'approved' | 'rejected'; appealId: number }): TemplatedMessage => {
  const outcome =
    input.status === 'approved'
      ? 'Your appeal was approved. Any related enforcement may be lifted according to our policies.'
      : 'Your appeal was rejected. The original decision stands.'
  return {
    template: 'appeal-status-update',
    subject: `Appeal #${input.appealId} ${input.status === 'approved' ? 'approved' : 'rejected'}`,
    textBody: `Update on appeal #${input.appealId}:\n\n${outcome}\n\n— SlopMuter`,
    htmlBody: `<p>Update on appeal #${escapeHtml(String(input.appealId))}:</p><p>${escapeHtml(outcome)}</p><p>— SlopMuter</p>`,
  }
}

const buildReportMutedTarget = (input: { targetUsername: string }): TemplatedMessage => {
  const safeHandle = escapeHtml(input.targetUsername)
  return {
    template: 'report-muted-target',
    subject: 'A reported account crossed the mute threshold',
    textBody: `Thanks for your reports. The account @${input.targetUsername} has crossed our mute threshold and was muted.\n\n— SlopMuter`,
    htmlBody: `<p>Thanks for your reports. The account <strong>@${safeHandle}</strong> has crossed our mute threshold and was muted.</p><p>— SlopMuter</p>`,
  }
}

const isSesConfigured = (): boolean => Boolean(env.sesFromEmail)

const sendTemplatedEmail = async (to: string, message: TemplatedMessage): Promise<void> => {
  if (!isSesConfigured()) {
    logger.debug({ template: message.template, to }, 'SES not configured; skipping email send')
    return
  }

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: env.sesFromEmail,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: message.subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: message.textBody, Charset: 'UTF-8' },
            Html: { Data: message.htmlBody, Charset: 'UTF-8' },
          },
        },
      }),
    )
    logger.info({ template: message.template, to }, 'Sent email via SES')
  } catch (err) {
    logger.error({ err, template: message.template, to }, 'Failed to send email via SES')
  }
}

const sendWelcomeEmail = async (input: { to: string; name: string | null }): Promise<void> => {
  await sendTemplatedEmail(input.to, buildWelcome(input.name))
}

const sendAccountDeletionConfirmationEmail = async (input: { to: string; name: string | null }): Promise<void> => {
  await sendTemplatedEmail(input.to, buildAccountDeletionConfirmation(input.name))
}

const sendAppealStatusUpdateEmail = async (input: {
  to: string
  status: 'approved' | 'rejected'
  appealId: number
}): Promise<void> => {
  await sendTemplatedEmail(input.to, buildAppealStatusUpdate(input))
}

const sendReportMutedTargetEmail = async (input: { to: string; targetUsername: string }): Promise<void> => {
  await sendTemplatedEmail(input.to, buildReportMutedTarget({ targetUsername: input.targetUsername }))
}

// Exports:
export {
  sendWelcomeEmail,
  sendAccountDeletionConfirmationEmail,
  sendAppealStatusUpdateEmail,
  sendReportMutedTargetEmail,
  isSesConfigured,
}
