/**
 * Per-page conditional script loading for connecthr.
 *
 * The always-on core (jQuery, Elementor + Elementor Pro frontend, connecthr-widgets)
 * is required for header nav / sticky / layout on every page. These flags gate the
 * *optional* libraries so a page only ships what its body actually uses:
 *
 *  - sliders   → /scripts/swiper.min.js (Elementor image/testimonial/media carousels + slides)
 *  - forms     → phone-flags.js + cf7-bridge.js  ── ALWAYS true: the sitewide Elementor Pro
 *                popups (ElementorPopups) embed wpcf7 forms on every page.
 *  - accordion → /scripts/accordion.js (Elementor accordion / toggle widgets)
 *  - blog      → /scripts/blog-load-more.js (Elementor posts grid + load-more button)
 *
 * Detection is a superset check on the rendered body HTML: when a marker is absent we
 * are confident the widget is not present, so the library is safe to drop. When in doubt
 * the flag stays true (ElementorScripts treats `!== false` as "load").
 */
export interface ScriptNeeds {
  sliders?: boolean;
  forms?: boolean;
  accordion?: boolean;
  blog?: boolean;
}

/**
 * @param html   rendered body HTML for the route (page/post/case-study body)
 * @param isHome home page also carries a swiper inside header-home.html
 */
export function computeScriptNeeds(html: string, isHome = false): ScriptNeeds {
  const h = html || "";
  return {
    sliders: isHome || /swiper/i.test(h),
    // Sitewide CF7 popups mean the form runtime is needed on every route.
    forms: true,
    accordion: /elementor-accordion|elementor-widget-toggle|elementor-toggle-item/i.test(h),
    blog: /ecs-posts|ecs-load-more|data-sp-blog/i.test(h),
  };
}
