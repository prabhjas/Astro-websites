/**
 * Blog single-post layout helpers for Elementor template 190 mirrors.
 * Moves Published/Modified meta from above the title to the end of the
 * main content column (after author block when present) — all blog posts.
 */
import * as cheerio from 'cheerio';

const DATE_META_CSS = `<style id="astro-blog-date-meta-end">
/* Published/Modified row at end of left content column */
.elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"]{
  margin-top:28px;
  margin-bottom:8px;
  padding-top:16px;
  border-top:1px solid #e6ebe6;
}
.elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] > .elementor-container{
  display:flex !important;
  flex-wrap:nowrap;
  width:100%;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}
.elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] > .elementor-container > .elementor-column{
  width:auto;
  max-width:none;
}
.elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] .elementor-element-c27b71e{
  flex:0 1 auto;
}
.elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] .elementor-element-f489bd9{
  flex:0 0 auto;
  margin-left:auto;
  text-align:right;
}
.elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] .elementor-element-e5c288a,
.elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] .elementor-element-e5c288a .elementor-widget-container,
.elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] .elementor-element-e5c288a .elementor-icon-list-items{
  text-align:right;
  justify-content:flex-end;
}
@media (max-width:767px){
  .elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] > .elementor-container{
    flex-direction:column;
    align-items:flex-start;
  }
  .elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] .elementor-element-f489bd9{
    margin-left:0;
    text-align:left;
  }
  .elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] .elementor-element-e5c288a,
  .elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] .elementor-element-e5c288a .elementor-widget-container,
  .elementor-190 .elementor-element-11bd243[data-astro-blog-dates="end"] .elementor-element-e5c288a .elementor-icon-list-items{
    text-align:left;
    justify-content:flex-start;
  }
}
</style>`;

/**
 * @param {string} html
 * @returns {string}
 */
export function relocateBlogPostDateMeta(html: string): string {
  if (!html.includes('data-id="11bd243"') || !html.includes('data-id="27c5cd0"')) {
    return html;
  }

  const $ = cheerio.load(html, { decodeEntities: false } as any);
  const dates = $('.elementor-element-11bd243').first();
  if (!dates.length) return html;

  const leftWrap = $('.elementor-element-27c5cd0 > .elementor-widget-wrap').first();
  if (!leftWrap.length) return html;

  // Already at end of column (after content / author)
  if (dates.attr('data-astro-blog-dates') === 'end') {
    if (!$('style#astro-blog-date-meta-end').length) {
      $('head').append(DATE_META_CSS);
    }
    return $.html();
  }

  dates.attr('data-astro-blog-dates', 'end');
  const moved = dates.remove();

  const author = leftWrap.children('.elementor-element-ba44ea0').first();
  const content = leftWrap.children('.elementor-element-42f7471').first();
  if (author.length) {
    author.after(moved);
  } else if (content.length) {
    content.after(moved);
  } else {
    leftWrap.append(moved);
  }

  if (!$('style#astro-blog-date-meta-end').length) {
    $('head').append(DATE_META_CSS);
  }

  // Drop one-off EOR layout CSS if present (superseded by global rule)
  $('style#astro-eor-post-layout').remove();

  return $.html();
}
