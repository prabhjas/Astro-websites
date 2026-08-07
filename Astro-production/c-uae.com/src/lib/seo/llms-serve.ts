import { resolveInternalAdminDir } from '../../env/server.ts';
import { LICENCE_HEADING, licenceLlmsSection } from '../licence.ts';
import { readLlmsConfig } from './llms-config-store.ts';
import { generateLlmsTxt } from './llms-generator.ts';
import { readManagedTextFile } from './text-files-store.ts';
import { resolveSiteOrigin, type ResolveSiteOriginOptions } from './site-url.ts';

/**
 * Trade-licence facts belong in llms.txt whichever way the body was produced,
 * so AI crawlers always see who we are and how to verify us. Skipped when a
 * dashboard override already spells the licence number out itself, and a no-op
 * while the licence record is still incomplete.
 */
function withLicenceSection(body: string, siteOrigin: string): string {
  if (body.includes(LICENCE_HEADING)) return body;
  const section = licenceLlmsSection(siteOrigin);
  if (!section) return body;
  // Keep the generator's trailing "<!-- Generated automatically … -->" stamp last.
  const stamp = body.match(/\n*<!-- Generated automatically[\s\S]*$/);
  if (stamp) {
    return `${body.slice(0, stamp.index).replace(/\s+$/, '')}\n\n${section}\n${stamp[0].replace(/^\n+/, '')}`;
  }
  return `${body.replace(/\s+$/, '')}\n\n${section}`;
}

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
      return { body: withLicenceSection(stored.content, siteOrigin), mode: 'override' };
    }
  }

  return {
    body: withLicenceSection(
      generateLlmsTxt({
      ...options,
      config,
      adminDir,
        env: options.env ?? (typeof process !== 'undefined' ? process.env : undefined),
      }),
      siteOrigin,
    ),
    mode: 'auto',
  };
}
