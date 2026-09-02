/** Uniform 16:9 featured images for Elementor loop template 124 post grids. */
export const BLOG_GRID_IMAGE_STYLES = `<style id="astro-blog-grid-images">
/* Insights index grid (f2c45fb) + single-post "Latest articles" (540c02a) */
.elementor-element-f2c45fb .elementor-widget-theme-post-featured-image .elementor-widget-container,
.elementor-element-f2c45fb .elementor-widget-theme-post-featured-image a,
.elementor-element-540c02a .elementor-widget-theme-post-featured-image .elementor-widget-container,
.elementor-element-540c02a .elementor-widget-theme-post-featured-image a {
  display: block;
  overflow: hidden;
  border-radius: 15px;
}
.elementor-element-f2c45fb .elementor-widget-theme-post-featured-image img,
.elementor-element-540c02a .elementor-widget-theme-post-featured-image img {
  width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
  object-fit: cover;
  object-position: center;
  display: block;
  border-radius: 15px;
}
</style>`;

export function injectBlogGridImageStyles(html: string): string {
  if (html.includes('astro-blog-grid-images')) return html;
  return html.replace('</head>', `${BLOG_GRID_IMAGE_STYLES}\n</head>`);
}
