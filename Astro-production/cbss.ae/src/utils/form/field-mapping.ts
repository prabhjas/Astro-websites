import type { ServerEnv } from '../../env/server';

/**
 * Central Pipedrive custom-field mapping.
 * Keys are logical form fields; values are Pipedrive field hash IDs from env.
 * Update env vars (PIPEDRIVE_FIELD_*) to change mappings without touching submission logic.
 */
export function getPipedriveFieldMapping(env: ServerEnv) {
  return env.fieldKeys;
}
