import {
  configureSiteCms,
  FEATURES_FULL_CMS,
  type ContactPayload,
  type LeadEnv,
  type PostsAdapter,
  type TaxonomyAdapter,
} from '@connect/site-cms';
import { getServerEnv } from './env/server';
import * as postsStore from './lib/internal-posts/store';
import * as taxonomyStore from './lib/internal-posts/taxonomy-store';
import { sendFormNotification } from './services/email';
import { logFormSuccess, logPipedriveFailure, logWarn } from './services/logger';
import { createPipedriveLead } from './services/pipedrive';

const posts: PostsAdapter = {
  listAllPosts: postsStore.listAllPosts,
  getPost: postsStore.getPost,
  deletePostPermanently: postsStore.deletePostPermanently,
  movePostToTrash: postsStore.movePostToTrash,
  restorePostFromTrash: postsStore.restorePostFromTrash,
  createOrUpdatePost: postsStore.createOrUpdatePost,
  getUploadDestinationPath: postsStore.getUploadDestinationPath,
  normalizeTagsCsv: postsStore.normalizeTagsCsv,
};

const taxonomy: TaxonomyAdapter = {
  listCategoryTerms: taxonomyStore.listCategoryTerms,
  listTagTerms: taxonomyStore.listTagTerms,
  upsertCategory: taxonomyStore.upsertCategory,
  upsertTag: taxonomyStore.upsertTag,
  moveCategoryToTrash: taxonomyStore.moveCategoryToTrash,
  restoreCategoryFromTrash: taxonomyStore.restoreCategoryFromTrash,
  deleteCategoryPermanently: taxonomyStore.deleteCategoryPermanently,
  moveTagToTrash: taxonomyStore.moveTagToTrash,
  restoreTagFromTrash: taxonomyStore.restoreTagFromTrash,
  deleteTagPermanently: taxonomyStore.deleteTagPermanently,
  getAllTagTerms: taxonomyStore.getAllTagTerms,
};

configureSiteCms({
  siteId: 'thefreelancergate',
  features: FEATURES_FULL_CMS,
  getLeadEnv: () => getServerEnv() as unknown as LeadEnv,
  createPipedriveLead: (env, payload) =>
    createPipedriveLead(env as never, payload as never) as ReturnType<typeof createPipedriveLead>,
  sendFormNotification: (env, payload) =>
    sendFormNotification(env as never, payload as ContactPayload as never),
  logFormSuccess,
  logPipedriveFailure,
  logWarn,
  posts,
  taxonomy,
});
