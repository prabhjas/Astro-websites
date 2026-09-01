import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type ManagedTextFile = {
  content: string;
  updatedAt: string;
  updatedBy: string;
};

export type ManagedTextKind = 'robots' | 'llm';

function filePath(rootDir: string, kind: ManagedTextKind): string {
  return join(rootDir, kind === 'robots' ? 'robots.json' : 'llm.json');
}

export function defaultRobotsContent(siteOrigin: string): string {
  const origin = siteOrigin.replace(/\/$/, '') || 'https://connectresources.ae';
  const host = origin.replace(/^https?:\/\//, '');
  return `# ============================================================
# robots.txt — ${host}
# Last updated: August 2026
# ============================================================
# STRUCTURE:
#   1. Global rules (all crawlers)
#   2. Search engine specific rules
#   3. AI crawler rules (selective allow)
#   4. Malicious / scraper bots (block)
#   5. Sitemap declaration
# ============================================================

# ============================================================
# 1. GLOBAL RULES — applies to all crawlers
# ============================================================
User-agent: *

# --- WordPress core ---
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Disallow: /wp-login.php
Disallow: /wp-json/
Disallow: /?rest_route=

# --- Internal search & filters ---
Disallow: /?s=
Disallow: /page/*/?s=
Disallow: /search/
Disallow: /*?replytocom=
Disallow: /*?orderby=
Disallow: /*?filter=
Disallow: /*?sort=
Disallow: /*?ref=
Disallow: /*?utm_source=
Disallow: /*?utm_medium=
Disallow: /*?utm_campaign=
Disallow: /*?utm_term=
Disallow: /*?utm_content=
Disallow: /*?fbclid=
Disallow: /*?gclid=
Disallow: /*?mc_eid=
Disallow: /*?sessionid=
Disallow: /*?sid=
Disallow: /*?token=
Disallow: /*?preview=true
Disallow: /*?preview=1
Disallow: /*?draft=

# --- Taxonomy / archive pages (low-value for this site) ---
Disallow: /tag/
Disallow: /category/
Disallow: /blog/page/
Disallow: /author/
Disallow: /date/
Disallow: /type/

# --- Feed / RSS ---
Disallow: /feed
Disallow: /feed/
Disallow: /rss
Disallow: /rss/
Disallow: /atom/
Disallow: /*/feed/
Disallow: /*/rss/

# --- Server / system directories ---
Disallow: /cgi-bin/
Disallow: /tmp/
Disallow: /private/
Disallow: /old-site-backups/
Disallow: /backup/
Disallow: /backups/
Disallow: /.git/
Disallow: /.env
Disallow: /node_modules/
Disallow: /vendor/
Disallow: /logs/
Disallow: /log/
Disallow: /cache/
Disallow: /config/
Disallow: /dist/
Disallow: /.well-known/

# --- E-commerce (not relevant to this site but safe to keep) ---
Disallow: /cart
Disallow: /checkout
Disallow: /my-account
Disallow: /login
Disallow: /register

# --- Admin / staging / dev paths ---
Disallow: /admin/
Disallow: /administrator/
Disallow: /dashboard/
Disallow: /staging/
Disallow: /dev/
Disallow: /development/
Disallow: /test/
Disallow: /testing/
Disallow: /demo/
Disallow: /sandbox/
Disallow: /preview/
Disallow: /internal/
Disallow: /beta/

# --- Common malicious / spam URL patterns ---
Disallow: /xmlrpc.php
Disallow: /wp-cron.php
Disallow: /wp-config.php
Disallow: /wp-settings.php
Disallow: /wp-load.php
Disallow: /wp-mail.php
Disallow: /wp-signup.php
Disallow: /wp-activate.php
Disallow: /wp-trackback.php
Disallow: /*.php$
Disallow: /phpmyadmin/
Disallow: /pma/
Disallow: /myadmin/
Disallow: /mysql/
Disallow: /sql/
Disallow: /db/
Disallow: /database/
Disallow: /installer/
Disallow: /install.php
Disallow: /setup.php
Disallow: /upgrade.php
Disallow: /readme.html
Disallow: /license.txt
Disallow: /wp-includes/
Disallow: /trackback/
Disallow: /*/trackback/
Disallow: /comments/
Disallow: /*/comments/
Disallow: /?p=
Disallow: /?page_id=
Disallow: /?attachment_id=
Disallow: /?cat=
Disallow: /?tag=
Disallow: /?author=
Disallow: /?m=

# --- Duplicate content / pagination traps ---
Disallow: /page/1/
Disallow: /*?paged=
Disallow: /*?page=
Disallow: /*?start=
Disallow: /*?offset=

# --- Allow media assets (needed for rendering & indexing images) ---
Allow: /wp-content/uploads/
Allow: /wp-content/
Allow: /public/
Allow: /assets/
Allow: /images/
Allow: /img/

# ============================================================
# 2. SEARCH ENGINE SPECIFIC RULES
# ============================================================

# Google — allow all (inherits global rules above)
User-agent: Googlebot
Allow: /

# Google Image bot — allow all public images
User-agent: Googlebot-Image
Allow: /wp-content/uploads/
Allow: /public/
Allow: /assets/

# Google AdsBot — must be named explicitly (not covered by *)
User-agent: AdsBot-Google
Allow: /
Disallow: /wp-admin/
Disallow: /wp-login.php

# Bing
User-agent: Bingbot
Allow: /

# Yandex
User-agent: Yandex
Allow: /

# DuckDuckGo
User-agent: DuckDuckBot
Allow: /

# ============================================================
# 3. AI CRAWLERS — selective allow (you control what they train on)
# ============================================================

# OpenAI — allowed (change to Disallow: / to block training)
User-agent: GPTBot
Allow: /

# Google Gemini / AI training
User-agent: Google-Extended
Allow: /

# Anthropic Claude
User-agent: Claude-Web
Allow: /
User-agent: ClaudeBot
Allow: /

# Perplexity AI
User-agent: PerplexityBot
Allow: /

# Meta AI
User-agent: FacebookBot
Allow: /

# Apple AI
User-agent: Applebot-Extended
Allow: /

# Cohere
User-agent: cohere-ai
Allow: /

# Common Crawl (used for training many models — block if desired)
# Uncomment below to block:
# User-agent: CCBot
# Disallow: /

# ============================================================
# 4. MALICIOUS BOTS & SCRAPERS — block entirely
# ============================================================

# Content scrapers
User-agent: AhrefsBot
Allow: /

User-agent: SemrushBot
Allow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: BLEXBot
Disallow: /

User-agent: PetalBot
Disallow: /

User-agent: SeznamBot
Disallow: /

User-agent: Exabot
Disallow: /

# Email harvesters
User-agent: EmailCollector
Disallow: /

User-agent: EmailSiphon
Disallow: /

User-agent: WebBandit
Disallow: /

User-agent: EmailWolf
Disallow: /

# Aggressive scrapers / bad bots
User-agent: HTTrack
Disallow: /

User-agent: WebCopier
Disallow: /

User-agent: WebReaper
Disallow: /

User-agent: WebStripper
Disallow: /

User-agent: SiteSnagger
Disallow: /

User-agent: TeleportPro
Disallow: /

User-agent: Offline Explorer
Disallow: /

User-agent: larbin
Disallow: /

User-agent: libwww
Disallow: /

User-agent: lwp-trivial
Disallow: /

User-agent: wget
Disallow: /

# NOTE: If you use Ahrefs or Semrush for your own SEO,
# replace Disallow: / with Allow: / for those bots above.
# Blocking them means their tools won't crawl your site,
# but also means competitors can't see your pages via their tools.

# ============================================================
# 5. SITEMAP & LLM
# ============================================================
Sitemap: ${origin}/sitemap_index.xml
LLM: ${origin}/llms.txt
`;
}

export function defaultLlmContent(): string {
  return [
    '# Connect Group LLM guidance',
    '# Edit this file from the internal SEO dashboard.',
    '# Describe the site, preferred citations, and any crawl constraints for AI systems.',
    '',
    'Site: https://connectgroup.co',
    '',
  ].join('\n');
}

export async function readManagedTextFile(
  rootDir: string,
  kind: ManagedTextKind,
): Promise<ManagedTextFile | null> {
  try {
    const raw = await readFile(filePath(rootDir, kind), 'utf8');
    const parsed = JSON.parse(raw) as ManagedTextFile;
    if (typeof parsed?.content !== 'string') return null;
    return {
      content: parsed.content,
      updatedAt: parsed.updatedAt || '',
      updatedBy: parsed.updatedBy || '',
    };
  } catch {
    return null;
  }
}

export async function writeManagedTextFile(
  rootDir: string,
  kind: ManagedTextKind,
  value: { content: string; updatedBy: string; updatedAt?: string },
): Promise<ManagedTextFile> {
  const next: ManagedTextFile = {
    content: value.content.replace(/\r\n/g, '\n'),
    updatedBy: value.updatedBy,
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
  const path = filePath(rootDir, kind);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export async function resolveManagedTextContent(
  rootDir: string,
  kind: ManagedTextKind,
  fallback: string,
): Promise<string> {
  const stored = await readManagedTextFile(rootDir, kind);
  if (stored && stored.content.trim()) return stored.content;
  return fallback;
}
