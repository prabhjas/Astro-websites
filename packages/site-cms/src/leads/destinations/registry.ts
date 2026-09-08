import { getSiteCms, type LeadEnv } from '../../context.js';
import type { LeadSubmissionRecord } from '../types.js';
import { createFlowDestination, readFlowConfig } from './flow.js';
import type { DestinationResult, LeadDestination } from './types.js';

/**
 * Pipedrive, as a destination.
 *
 * Note it has NO idempotency key: every call creates a fresh person and lead.
 * That is why the service must never re-send a destination that has already
 * succeeded — a whole-lead retry after a Flow failure would duplicate the
 * customer in Pipedrive. See the skip in deliverStoredLead().
 */
export function createPipedriveDestination(maxAttempts: number): LeadDestination {
  return {
    id: 'pipedrive',
    maxAttempts,
    async deliver(env: LeadEnv, record: LeadSubmissionRecord): Promise<DestinationResult> {
      // File-only mode: a blank token means store the lead and schedule nothing,
      // rather than accruing failed attempts against a destination this site was
      // never configured to use.
      if (!String((env as Record<string, unknown>).pipedriveApiToken ?? '').trim()) {
        return {
          success: false,
          skipped: true,
          reason: 'Pipedrive skipped (PIPEDRIVE_API_TOKEN not configured) — stored locally',
        };
      }
      const cms = getSiteCms();
      const result = await cms.createPipedriveLead(env, record.payload);
      if (result.success) {
        return {
          success: true,
          externalId: result.leadId,
          externalRefs: { personId: String(result.personId) },
          summary: 'Lead created in Pipedrive',
        };
      }
      return {
        success: false,
        retryable: result.retryable,
        errorCode: result.errorCode,
        error: result.error,
        statusCode: result.statusCode,
      };
    },
  };
}

/**
 * The destinations this site delivers to, in the order they are registered.
 * Dispatch is parallel, so order carries no timing meaning — it only fixes the
 * order results are recorded in.
 *
 * Pipedrive is always present so behaviour is unchanged until a site is given
 * Flow credentials and FLOW_ENABLED. Set PIPEDRIVE_ENABLED=false to retire it
 * cleanly on the cutover date, rather than leaving it to fail on every lead and
 * bury a real Flow problem in retry noise.
 */
export function resolveDestinations(env: LeadEnv): LeadDestination[] {
  const raw = env as Record<string, unknown>;
  const proc: Record<string, string | undefined> =
    typeof process !== 'undefined' && process.env ? process.env : {};
  const destinations: LeadDestination[] = [];

  // PIPEDRIVE_ENABLED=false retires it on the cutover date as a config change,
  // not a code change and not 36 releases. Leaving it enabled after Pipedrive
  // stops accepting leads would accrue a failed attempt and a retry schedule on
  // every lead forever, which is exactly the noise that would hide a real Flow
  // problem at the moment Flow becomes the only destination.
  const pipedriveEnabled =
    raw.pipedriveEnabled !== false && String(proc.PIPEDRIVE_ENABLED ?? '').toLowerCase() !== 'false';

  if (pipedriveEnabled) {
    destinations.push(createPipedriveDestination(Number(raw.pipedriveMaxRetryAttempts ?? 5)));
  }

  const flowConfig = readFlowConfig(env);
  if (flowConfig) destinations.push(createFlowDestination(flowConfig));

  return destinations;
}
