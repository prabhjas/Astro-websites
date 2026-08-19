/**
 * Dynamic llms.txt generator — mirrors sitemap discovery so AI crawlers always
 * see live published pages/posts, grouped like the curated SEO llms seed file.
 */
import { getBlogPost } from '../blog.ts';
import { loadPageSeo } from '../seo.ts';
import {
  getLlmsSeedDefaults,
  resolveLlmsEntryMeta,
  type LlmsConfig,
} from './llms-config-store.ts';
import { collectPageEntries, collectPostEntries } from './sitemap-data.ts';
import { pathFromSitemapUrl } from './sitemap-overrides-store.ts';
import { resolveSiteOrigin, type ResolveSiteOriginOptions } from './site-url.ts';

export type GenerateLlmsOptions = ResolveSiteOriginOptions & {
  config: LlmsConfig;
  adminDir?: string;
};

function cleanTitle(raw: string, fallback: string): string {
  const trimmed = raw.replace(/\s*\|\s*Redo\s*$/i, '').trim();
  return trimmed || fallback;
}

function cleanDescription(raw: string | undefined, limit = 180): string {
  if (!raw) return '';
  const text = raw.replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

function formatLink(title: string, url: string, description?: string): string {
  const desc = cleanDescription(description);
  return desc ? `- [${title}](${url}): ${desc}` : `- [${title}](${url})`;
}

export function generateLlmsTxt(options: GenerateLlmsOptions): string {
  const { config } = options;
  const siteOrigin = resolveSiteOrigin(options);
  const seed = getLlmsSeedDefaults();
  const pages = collectPageEntries(siteOrigin, {});
  const posts = collectPostEntries(siteOrigin, {});

  type Item = { path: string; title: string; url: string; description: string; group: string };
  const groups = new Map<string, Item[]>();

  for (const entry of pages) {
    const path = pathFromSitemapUrl(entry.url, siteOrigin);
    if (!path) continue;
    const meta = resolveLlmsEntryMeta(path, config);
    if (meta.exclude) continue;

    const slug = path === '/' ? '' : path.replace(/^\/|\/$/g, '');
    let title = meta.title;
    let description = meta.description || '';
    try {
      const seo = loadPageSeo(slug === '' ? 'home' : slug);
      title = title || cleanTitle(seo.title, slug || 'Home');
      description = description || seo.description;
    } catch {
      title = title || (slug || 'Home');
    }

    const item: Item = {
      path,
      title: title || path,
      url: entry.url,
      description: cleanDescription(description),
      group: meta.group,
    };
    const list = groups.get(item.group) || [];
    list.push(item);
    groups.set(item.group, list);
  }

  // Ensure curated category links from seed still appear even if not in page sitemap.
  for (const [path, seedEntry] of Object.entries(seed.entries)) {
    if (!path.startsWith('/category/')) continue;
    if (pathFromSitemapUrl(`${siteOrigin}${path}`, siteOrigin) == null) continue;
    const meta = resolveLlmsEntryMeta(path, config);
    if (meta.exclude) continue;
    const already = [...groups.values()].some((list) => list.some((i) => i.path === path));
    if (already) continue;
    const group = meta.group || seedEntry.group;
    const list = groups.get(group) || [];
    list.push({
      path,
      title: meta.title || seedEntry.title,
      url: `${siteOrigin.replace(/\/$/, '')}${path}`,
      description: cleanDescription(meta.description || seedEntry.description),
      group,
    });
    groups.set(group, list);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }

  const orderedGroups = [
    ...config.groupOrder.filter((name) => groups.has(name)),
    ...[...groups.keys()].filter((name) => !config.groupOrder.includes(name)).sort((a, b) => a.localeCompare(b)),
  ].filter((name) => name !== 'Blog & Insights');

  const lines: string[] = [];
  lines.push(`# ${config.siteTitle}`);
  lines.push('');
  lines.push(`> ${config.summary.trim()}`);
  lines.push('');
  if (config.details.trim()) {
    lines.push(config.details.trim());
    lines.push('');
  }

  for (const groupName of orderedGroups) {
    const items = groups.get(groupName);
    if (!items?.length) continue;
    lines.push(`## ${groupName}`);
    lines.push('');
    for (const item of items) {
      lines.push(formatLink(item.title, item.url, item.description));
    }
    lines.push('');
  }

  // Blog section: insights home + categories + recent posts
  const blogItems = groups.get('Blog & Insights') || [];
  const recentPosts = [...posts]
    .map((entry) => {
      const path = pathFromSitemapUrl(entry.url, siteOrigin);
      if (!path) return null;
      const meta = resolveLlmsEntryMeta(path, config);
      if (meta.exclude) return null;
      const slug = path.replace(/^\/|\/$/g, '');
      const post = getBlogPost(slug);
      const published = post?.publishedAt || entry.lastmod || '';
      return {
        path,
        url: entry.url,
        title: meta.title || post?.title || slug,
        description: cleanDescription(meta.description || post?.description),
        published,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => Date.parse(b.published || '0') - Date.parse(a.published || '0'))
    .slice(0, config.postsCount);

  if (blogItems.length || recentPosts.length) {
    lines.push('## Blog & Insights');
    lines.push('');
    const blogHome = seed.blogHome || '/insights/';
    const insights = blogItems.find((i) => i.path === blogHome);
    if (insights) {
      lines.push(formatLink(insights.title, insights.url, insights.description));
    } else {
      lines.push(
        formatLink(
          'Insights (Blog Home)',
          `${siteOrigin.replace(/\/$/, '')}${blogHome}`,
          'Main blog index covering UAE business, HR, tax, visa and company formation topics.',
        ),
      );
    }

    const categoryItems = blogItems.filter((i) => i.path.startsWith('/category/'));
    if (categoryItems.length) {
      const cats = categoryItems
        .map((i) => `[${i.title}](${i.url})`)
        .join(', ');
      lines.push(`- Categories: ${cats}`);
    } else if (seed.categoryMarkdown) {
      lines.push(`- Categories: ${seed.categoryMarkdown}`);
    }

    for (const post of recentPosts) {
      const when = post.published
        ? ` (${new Date(post.published).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })})`
        : '';
      lines.push(formatLink(post.title, post.url, `${post.description}${when}`.trim()));
    }

    if (config.blogNote.trim()) {
      lines.push('');
      lines.push(`Note: ${config.blogNote.trim()}`);
    }
    lines.push('');
  }

  // Remaining non-category blog seed items (e.g. insights) already handled.
  // About etc. already in ordered groups.

  if (config.optionalMarkdown.trim()) {
    lines.push('## Optional');
    lines.push('');
    lines.push(config.optionalMarkdown.trim());
    lines.push('');
  }

  lines.push(
    `<!-- Generated automatically from live sitemap pages/posts on ${new Date().toISOString()} -->`,
  );
  lines.push('');
  return lines.join('\n');
}
