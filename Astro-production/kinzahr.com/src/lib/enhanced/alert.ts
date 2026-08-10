/**
 * Ops alert for enhanced conversion hard failures only.
 * Optional SMTP — if not configured, logs a warning and skips (job still returns 500).
 * Not used for lead-form notifications (those stay Pipedrive + file store).
 */
import nodemailer from 'nodemailer';

export type EnhancedAlertPayload = {
  jobId: string;
  status: number;
  reason: string;
  category: string;
  detail: string;
  logTail: string;
  at: string;
};

function env(name: string, fallback = ''): string {
  return String(process.env[name] || '').trim() || fallback;
}

/** Classify failure for subject line / triage (API version bumps, token, Pipedrive, etc.). */
export function classifyEnhancedFailure(log: string[], error: unknown): { category: string; reason: string } {
  const blob = `${log.join('\n')}\n${typeof error === 'string' ? error : JSON.stringify(error || '')}`.toLowerCase();

  if (
    /unsupported|not found|404|api version|version.*(invalid|unsupported|deprecated)|v\d+.*(not|no longer)/i.test(
      blob,
    ) ||
    /googleads\.googleapis\.com\/v\d+/i.test(blob) && /404|not found|unimplemented/i.test(blob)
  ) {
    return {
      category: 'ads_api_version',
      reason:
        'Google Ads API call failed in a way that often means the API version must be updated (or the endpoint path changed). Check googleads.googleapis.com version in run-job.ts.',
    };
  }
  if (/refreshing google ads|error refreshing token|invalid_grant|unauthorized_client|invalid_client/i.test(blob)) {
    return {
      category: 'ads_oauth',
      reason: 'Google OAuth token refresh failed — check GOOGLE_ADS_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN.',
    };
  }
  if (/developer.token|developer-token|PERMISSION_DENIED|unauthorized/i.test(blob) && /google/i.test(blob)) {
    return {
      category: 'ads_auth',
      reason: 'Google Ads auth/permission error — check GOOGLE_ADS_DEVELOPER_TOKEN and account access.',
    };
  }
  if (/pipedrive/i.test(blob) && /error|http [45]/i.test(blob)) {
    return {
      category: 'pipedrive',
      reason: 'Pipedrive fetch failed — check PIPEDRIVE_API_TOKEN / company domain / API availability.',
    };
  }
  if (/missing required env/i.test(blob)) {
    return {
      category: 'config',
      reason: 'Required environment variables are missing for the enhanced conversion job.',
    };
  }
  if (/timeout|fetch failed|econnrefused|enotfound|network/i.test(blob)) {
    return {
      category: 'network',
      reason: 'Network/timeout talking to Pipedrive or Google Ads.',
    };
  }
  return {
    category: 'unknown',
    reason: 'Enhanced conversion job failed — see detail/log in this email.',
  };
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendEnhancedFailureAlert(payload: EnhancedAlertPayload): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  const to = env('ENHANCED_ALERT_EMAIL', 'prabhjas.s@connectgroup.co');
  const host = env('SMTP_HOST');
  const from = env('ENHANCED_ALERT_FROM', env('FORM_FROM_EMAIL', env('SMTP_USER')));
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASS');
  const port = Number(env('SMTP_PORT', '587')) || 587;
  const secure = String(env('SMTP_SECURE', '')).toLowerCase() === 'true' || port === 465;

  if (!to) return { sent: false, skipped: 'no_alert_email' };
  if (!host || !from) {
    console.warn('[enhanced-alert] skipped (SMTP_HOST / from address not configured)', {
      jobId: payload.jobId,
      category: payload.category,
    });
    return { sent: false, skipped: 'smtp_not_configured' };
  }

  const subject = `[Kinza enhanced FAIL] ${payload.jobId} — ${payload.category}`;
  const text = [
    `Enhanced conversion job failed.`,
    ``,
    `Job: ${payload.jobId}`,
    `When: ${payload.at}`,
    `HTTP status: ${payload.status}`,
    `Category: ${payload.category}`,
    `Reason: ${payload.reason}`,
    ``,
    `Detail:`,
    payload.detail,
    ``,
    `Log tail:`,
    payload.logTail,
  ].join('\n');

  const html = `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
    await transporter.sendMail({ from, to, subject, text, html });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[enhanced-alert] send failed', { jobId: payload.jobId, message });
    return { sent: false, error: message };
  }
}
