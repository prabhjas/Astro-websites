/**
 * Bind this site to @connect/site-cms (shared leads + bearer auth).
 * Import from middleware so configuration runs before API handlers.
 */
import {
  configureSiteCms,
  FEATURES_LEADS_ONLY,
  type ContactPayload,
  type LeadEnv,
} from '@connect/site-cms';
import { getServerEnv } from './env/server';
import { sendFormNotification } from './services/email';
import { logFormSuccess, logPipedriveFailure, logWarn } from './services/logger';
import { createPipedriveLead } from './services/pipedrive';

configureSiteCms({
  siteId: 'cbss',
  features: FEATURES_LEADS_ONLY,
  getLeadEnv: () => getServerEnv() as unknown as LeadEnv,
  createPipedriveLead: (env, payload) =>
    createPipedriveLead(env as never, payload as never) as ReturnType<typeof createPipedriveLead>,
  sendFormNotification: (env, payload) =>
    sendFormNotification(env as never, payload as ContactPayload as never),
  logFormSuccess,
  logPipedriveFailure,
  logWarn,
});
