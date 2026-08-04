import { getSiteCms, type PostsAdapter, type TaxonomyAdapter } from './context.js';

export type { PostsAdapter, TaxonomyAdapter };

export function getPostsAdapter(): PostsAdapter {
  const posts = getSiteCms().posts;
  if (!posts) {
    throw new Error(
      '@connect/site-cms: posts adapter not configured (FEATURES_FULL_CMS sites must pass posts in configureSiteCms).',
    );
  }
  return posts;
}

export function getTaxonomyAdapter(): TaxonomyAdapter {
  const taxonomy = getSiteCms().taxonomy;
  if (!taxonomy) {
    throw new Error('@connect/site-cms: taxonomy adapter not configured.');
  }
  return taxonomy;
}
