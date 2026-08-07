import type { APIRoute } from 'astro';
import { writeFileSync } from 'node:fs';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { getPostsAdapter, getTaxonomyAdapter } from '../../adapters.js';
import { sanitizeCmsHtml } from '../../security/sanitize-html.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const postsApi = getPostsAdapter();
  const taxonomy = getTaxonomyAdapter();

  const formData = await request.formData();

  const originalSlug = String(formData.get('originalSlug') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const slug = String(formData.get('slug') || '').trim();
  const contentHtml = sanitizeCmsHtml(String(formData.get('contentHtml') || '').trim());
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

  if (!title) return internalJson({ success: false, message: 'Missing title' }, 400);
  if (!slug) return internalJson({ success: false, message: 'Missing slug' }, 400);
  if (!contentHtml) return internalJson({ success: false, message: 'Missing contentHtml' }, 400);
  if (!categoryName || !categorySlug) return internalJson({ success: false, message: 'Missing category' }, 400);

  const env = getLeadEnv();

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
      return internalJson(
        { success: false, message: `File exceeds limit of ${env.internalUploadMaxFileBytes} bytes.` },
        413,
      );
    }

    const destination = postsApi.getUploadDestinationPath(featuredImageFile.name);
    const buf = Buffer.from(await featuredImageFile.arrayBuffer());
    writeFileSync(destination.filePath, buf);

    featuredImage = { publicUrl: destination.publicUrl, fileName: featuredImageFile.name };
  }

  const category: any = { name: categoryName, slug: categorySlug, url: `/category/${categorySlug}/` };

  const result = postsApi.createOrUpdatePost({
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

  const parsedTags = postsApi.normalizeTagsCsv(tagsCsv);
  const allTagTerms = taxonomy.getAllTagTerms();
  for (const t of parsedTags) {
    const existing = allTagTerms.find((x) => x.slug === t.slug);
    if (!existing) {
      taxonomy.upsertTag({ name: t.name, slug: t.slug });
    } else if ((existing.status || 'active') === 'trash') {
      taxonomy.restoreTagFromTrash(t.slug);
    }
  }

  return internalJson({ success: true, slug: result.slug });
};
