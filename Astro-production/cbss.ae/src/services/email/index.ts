import type { ServerEnv } from '../../env/server';
import type { NormalisedContactForm } from '../../utils/form/validate';
import { parseNotificationEmails } from '../../utils/form/parse-emails';
import { isMeaningfulValue } from '../../utils/form/remove-empty';
import { logInfo, logWarn } from '../logger';

export type EmailResult = { sent: boolean; skipped: boolean; error?: string };

function buildEmailBody(env: ServerEnv, form: NormalisedContactForm): { subject: string; text: string; html: string } {
  const lines: Array<[string, string]> = [
    ['Form', form.formName || env.formName],
    ['Website', `${env.websiteName} (${env.websiteId})`],
    ['Submitted at', form.submittedAt],
    ['Name', form.fullName],
    ['Email', form.email],
    ['Phone', form.phone],
    ['Message', form.message],
    ['Company', form.company],
    ['Location', form.location],
    ['Country', form.country],
    ['City', form.city],
    ['Postcode', form.postcode],
    ['Campaign', form.campaign],
    ['Campaign ID', form.campaignId],
    ['Lead source', form.leadSource],
    ['Form source', form.formSource],
    ['Page URL', form.pageUrl],
    ['Referrer', form.referrerUrl],
    ['UTM source', form.utmSource],
    ['UTM medium', form.utmMedium],
    ['UTM campaign', form.utmCampaign],
    ['UTM term', form.utmTerm],
    ['UTM content', form.utmContent],
    ['GCLID', form.gclid],
    ['FBCLID', form.fbclid],
    ['Nationality', form.nationality],
    ['Profession / sector', form.professionSector],
    ['Keyword', form.keyword],
    ['Device', form.device],
    ['Network', form.network],
  ];

  const visible = lines.filter(([, value]) => isMeaningfulValue(value));
  const text = visible.map(([label, value]) => `${label}: ${value}`).join('\n');
  const html = `<pre style="font-family: sans-serif; white-space: pre-wrap;">${text}</pre>`;
  const subject = `New enquiry: ${form.fullName} — ${env.websiteName}`;

  return { subject, text, html };
}

async function sendViaSmtp(
  env: ServerEnv,
  recipients: string[],
  subject: string,
  text: string,
  html: string,
): Promise<void> {
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: env.smtpUser
      ? {
          user: env.smtpUser,
          pass: env.smtpPass,
        }
      : undefined,
  });

  await transporter.sendMail({
    from: env.fromName ? `"${env.fromName}" <${env.fromEmail}>` : env.fromEmail,
    to: recipients.join(', '),
    subject,
    text,
    html,
  });
}

export async function sendFormNotification(env: ServerEnv, form: NormalisedContactForm): Promise<EmailResult> {
  const recipients = parseNotificationEmails(env.notificationEmails);

  if (recipients.length === 0) {
    logInfo('email_notification_skipped', {
      reason: 'no_recipients_configured',
      websiteId: env.websiteId,
      formName: form.formName || env.formName,
    });
    return { sent: false, skipped: true };
  }

  if (!env.fromEmail || !env.smtpHost) {
    logWarn('email_notification_skipped', {
      reason: 'smtp_not_configured',
      websiteId: env.websiteId,
    });
    return { sent: false, skipped: true };
  }

  const { subject, text, html } = buildEmailBody(env, form);

  try {
    await sendViaSmtp(env, recipients, subject, text, html);
    return { sent: true, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email send failed';
    logWarn('email_notification_failed', {
      websiteId: env.websiteId,
      formName: form.formName || env.formName,
      errorMessage: message,
    });
    return { sent: false, skipped: false, error: message };
  }
}
