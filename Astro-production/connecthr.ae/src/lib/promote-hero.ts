/**
 * Promote a route's LCP hero image(s) to eager, high-priority loading.
 *
 * The WP mirror ships every image with loading="lazy" (WordPress default). On the
 * hero/LCP image that defeats the <link rel=preload> in <head>: Lighthouse's Lantern
 * simulation will not credit the preload toward LCP while the element is lazy, so LCP
 * lands seconds after FCP even though the bytes are already fetched. Flipping the
 * designated hero image to loading="eager" + fetchpriority="high" (and decoding sync)
 * lets both real browsers and Lantern paint it in the critical path.
 *
 * Only the images whose src matches a manifest hero href are touched — every other
 * image keeps loading="lazy", so below-the-fold work stays deferred.
 *
 * @param html      rendered body HTML
 * @param heroHrefs hero image URLs from cwv-manifest (route.hero[].href), image entries only
 */
export function promoteHeroImages(html: string, heroHrefs: string[]): string {
  if (!html) return html;
  let out = html;
  // 1) Manifest hero image(s): eager + high priority + preloaded in <head>.
  for (const href of heroHrefs) {
    if (!href) continue;
    const esc = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`<img\\b([^>]*\\bsrc="${esc}"[^>]*)>`, "i");
    out = out.replace(re, (full, attrs) => {
      if (/\bfetchpriority=/i.test(attrs)) return full;
      let a = attrs.replace(/\s*loading="[^"]*"/i, "").replace(/\s*decoding="[^"]*"/i, "");
      a += ' loading="eager" fetchpriority="high" decoding="async"';
      return `<img${a}>`;
    });
  }
  // 2) The leading in-content image sits at the top of the fold. WordPress core itself
  //    skips lazy-loading on the first content image so it starts fetching immediately;
  //    we mirror that (EAGER_COUNT = 1). Keep it at 1: eager-loading more images only
  //    adds high-priority bytes that congest the critical path on text-LCP pages (the
  //    fold reflow CLS is fixed by responsive-utils.css, not by eager images). Every
  //    later image stays lazy.
  const EAGER_COUNT = 1;
  let seen = 0;
  out = out.replace(/<img\b[^>]*>/gi, (tag) => {
    if (seen >= EAGER_COUNT) return tag;
    seen++;
    if (/\bfetchpriority=/i.test(tag)) return tag; // already the promoted hero
    if (!/\bloading="lazy"/i.test(tag)) return tag;
    return tag.replace(/\s*loading="lazy"/i, ' loading="eager"');
  });
  return out;
}
