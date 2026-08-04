import { resolveInternalAdminDir } from '../../env/server.ts';
import { readLlmsConfig } from './llms-config-store.ts';
import { generateLlmsTxt } from './llms-generator.ts';
import { readManagedTextFile } from './text-files-store.ts';
import { resolveSiteOrigin, type ResolveSiteOriginOptions } from './site-url.ts';

/** Serve llms.txt: full dashboard override when enabled, otherwise auto from live sitemap. */
export async function resolveLlmsTxtBody(
  options: ResolveSiteOriginOptions = {},
): Promise<{ body: string; mode: 'auto' | 'override' }> {
  const adminDir = resolveInternalAdminDir();
  const config = await readLlmsConfig(adminDir);
  const siteOrigin = resolveSiteOrigin(options);

  if (config.mode === 'override') {
    const stored = await readManagedTextFile(adminDir, 'llm');
    if (stored?.content.trim()) {
      return { body: stored.content, mode: 'override' };
    }
  }

  return {
    body: generateLlmsTxt({
      ...options,
      config,
      adminDir,
      env: options.env ?? (typeof process !== 'undefined' ? process.env : undefined),
    }),
    mode: 'auto',
  };
}
