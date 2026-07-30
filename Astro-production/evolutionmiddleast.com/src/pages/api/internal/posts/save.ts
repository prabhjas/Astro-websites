import type { APIRoute } from 'astro';
import { writeFileSync } from 'node:fs';
import { getServerEnv } from '../../../../env/server';
import { hasDashboardRole, requireCsrf } from '../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../lib/auth/session';
import { createOrUpdatePost, getUploadDestinationPath, normalizeTagsCsv, type CategoryOption } from '../../../../lib/internal-posts/store';
import { applyInternalNoIndexHeaders } from '../../../../lib/security/internal-response';
import { getAllTagTerms, restoreTagFromTrash, upsertTag } from '../../../../lib/internal-posts/taxonomy-store';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const headers = new Headers();
  applyInternalNoIndexHeaders(headers);

  const session = readDashboardSession(cookies);
  if (!session || !hasDashboardRole(session, 'developer')) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const formData = await request.formData();
  const csrfToken = String(formData.get('csrfToken') || '');
  if (!requireCsrf(session, csrfToken)) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const originalSlug = String(formData.get('originalSlug') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const slug = String(formData.get('slug') || '').trim();
  const contentHtml = String(formData.get('contentHtml') || '').trim();
  const categoryName = String(formData.get('categoryName') || '').trim();
  const categorySlug = String(formData.get('categorySlug') || '').trim();
  const tagsCsv = String(formData.get('tagsCsv') || '').trim();
  const statusRaw = String(formData.get('status') || 'draft').trim();
  const status = statusRaw === 'published' ? 'published' : statusRaw === 'trash' ? 'trash' : 'draft';
  const publishDateRaw = String(formData.get('publishDate') || '').trim();
  const publishDateISO = publishDateRaw ? new Date(publishDateRaw).toISOString() : new Date().toISOString();

  const metaTitle = String(formData.get('metaTitle') || '').trim();
  const metaDescription = String(formData.get('metaDescription') || '').trim();
  const noIndex = String(formData.get('noIndex') || '').trim() === '1' || formData.get('noIndex') === 'on';
  const noFollow = String(formData.get('noFollow') || '').trim() === '1' || formData.get('noFollow') === 'on';

  if (!title) return new Response('Missing title', { status: 400, headers });
  if (!slug) return new Response('Missing slug', { status: 400, headers });
  if (!contentHtml) return new Response('Missing contentHtml', { status: 400, headers });
  if (!categoryName || !categorySlug) return new Response('Missing category', { status: 400, headers });

  const env = getServerEnv();

  // Featured image: either remove or upload a new one.
  const removeFeaturedImage = String(formData.get('removeFeaturedImage') || '') === '1';
  const featuredImageFile = formData.get('featuredImageFile');

  let featuredImage:
    | { publicUrl: string; fileName: string }
    | null
    | undefined = undefined;

  if (removeFeaturedImage) {
    featuredImage = null;
  } else if (featuredImageFile instanceof File && featuredImageFile.size > 0) {
    if (featuredImageFile.size > env.internalUploadMaxFileBytes) {
      return new Response(`File exceeds limit of ${env.internalUploadMaxFileBytes} bytes.`, { status: 413, headers });
    }

    const destination = getUploadDestinationPath(featuredImageFile.name);
    const buf = Buffer.from(await featuredImageFile.arrayBuffer());
    writeFileSync(destination.filePath, buf);

    featuredImage = { publicUrl: destination.publicUrl, fileName: featuredImageFile.name };
  }

  const category: CategoryOption = { name: categoryName, slug: categorySlug, url: `/category/${categorySlug}/` };

  const result = createOrUpdatePost({
    originalSlug: originalSlug || undefined,
    slug,
    title,
    contentHtml,
    category,
    tagsCsv,
    status,
    publishDateISO,
    metaTitle,
    metaDescription,
    noIndex,
    noFollow,
    featuredImage: featuredImage === undefined ? undefined : featuredImage,
  });

  // Ensure tags exist in global taxonomy (and restore if they were trashed).
  // This keeps the Categories/Tags management screens consistent with what posts use.
  const parsedTags = normalizeTagsCsv(tagsCsv);
  const allTagTerms = getAllTagTerms();
  for (const t of parsedTags) {
    const existing = allTagTerms.find((x) => x.slug === t.slug);
    if (!existing) {
      upsertTag({ name: t.name, slug: t.slug });
    } else if ((existing.status || 'active') === 'trash') {
      restoreTagFromTrash(t.slug);
    }
  }

  const nextUrl = `/internal/operations/posts/${encodeURIComponent(result.slug)}/`;
  return redirect(nextUrl, 303);
};

