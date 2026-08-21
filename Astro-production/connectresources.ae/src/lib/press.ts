/**
 * Press Release helpers.
 *
 * Internal press releases live as `type: "press-release"` posts at `/press/{slug}/`.
 * External media mentions stay as static cards on `/press/` and open off-site.
 * The `/press/` listing merges both (newest first) with one Load More control.
 */
import * as cheerio from "cheerio";
import {
  getPressReleasePosts,
  normalizePath,
  stripHtml,
  type PostEntry,
} from "./content";

export const PRESS_RELEASE_TYPE = "press-release" as const;
export const PRESS_LISTING_PATH = "/press/";
export const PRESS_RELEASE_PATH_PREFIX = "/press/";
/** Legacy WP prefix — 301 redirects to /press/{slug}/; lookup helper kept for tooling. */
export const PRESS_RELEASE_LEGACY_PREFIX = "/press-release/";

const INITIAL_VISIBLE_ROWS = 4;
const PLACEHOLDER_IMG = "/assets/images/2022/02/2-1024x575.png";

export { getPressReleasePosts };

export function isPressReleasePost(post: Pick<PostEntry, "type">): boolean {
  return post.type === PRESS_RELEASE_TYPE;
}

export function pressReleasePath(slug: string): string {
  const clean = String(slug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/^press\//, "")
    .replace(/^press-release\//, "");
  return normalizePath(`${PRESS_RELEASE_PATH_PREFIX}${clean}/`);
}

/** Map legacy `/press-release/{slug}/` → canonical `/press/{slug}/` (lookup only, no redirect). */
export function canonicalPressPathFromRequest(pathname: string): string | null {
  const normalized = normalizePath(pathname);
  const m = normalized.match(/^\/press-release\/([^/]+)\/$/);
  if (!m) return null;
  return pressReleasePath(m[1]);
}

export function formatPressCardDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(+d)) return "";
  // Match existing /press/ card labels: "Feb 6 2023"
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .replace(",", "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function excerptForCard(post: PostEntry, max = 180): string {
  const raw = stripHtml(post.excerpt || post.content || post.bodyHtml || "").trim();
  if (!raw) return "";
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max).trim()}…`;
}

function cardImageSrc(post: PostEntry): string {
  return (post.featuredImage || post.seo?.ogImage || "").trim() || PLACEHOLDER_IMG;
}

/** One internal press-release card (matches existing /press/ card markup). */
export function renderPressReleaseCardHtml(post: PostEntry): string {
  const title = stripHtml(post.title);
  const href = normalizePath(post.path || pressReleasePath(post.slug));
  const excerpt = excerptForCard(post);
  const dateLabel = formatPressCardDate(post.date);
  const img = cardImageSrc(post);
  const alt = escapeHtml(title);

  return `<div class="vc_col-sm-6 wpb_column vc_column_container box_r2 cr-press-post-card" data-press-release-id="${post.id}">
<div class="vc_column-inner us_custom_70f9d2ac"><div class="wpb_wrapper">
<div class="w-image cr-press-featured-img align_none"><div class="w-image-h">
<img alt="${alt}" class="attachment-full size-full" decoding="async" loading="lazy" src="${escapeHtml(img)}"/>
</div></div>
<div class="wpb_text_column us_custom_55c766a6 has_text_color"><div class="wpb_wrapper"><p>${escapeHtml(title)}</p></div></div>
<div class="wpb_text_column us_custom_ec2ef2b2 has_text_color"><div class="wpb_wrapper"><p>${escapeHtml(excerpt)}</p></div></div>
<div class="g-cols wpb_row via_flex valign_middle type_default stacking_default">
<div class="vc_col-sm-6 wpb_column vc_column_container"><div class="vc_column-inner"><div class="wpb_wrapper">
<div class="w-btn-wrapper align_none"><a class="w-btn us-btn-style_6 icon_atright" href="${escapeHtml(href)}"><span class="w-btn-label">Read More</span><i class="fas fa-arrow-right"></i></a></div>
</div></div></div>
<div class="vc_col-sm-6 wpb_column vc_column_container"><div class="vc_column-inner"><div class="wpb_wrapper">
<div class="wpb_text_column us_custom_ec7802d3 has_text_color"><div class="wpb_wrapper"><p>${escapeHtml(dateLabel)}</p></div></div>
</div></div></div>
</div>
</div></div></div>`;
}

type FeedCard = {
  date: Date;
  html: string;
  title: string;
  href: string;
  img: string;
  excerpt: string;
  isInternal: boolean;
  isExternal: boolean;
};

function parseCardDate(text: string): Date {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  const m = cleaned.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return new Date(0);
  const tryParse = Date.parse(`${m[1]} ${m[2]}, ${m[3]}`);
  return Number.isNaN(tryParse) ? new Date(0) : new Date(tryParse);
}

function isWeakHref(href: string): boolean {
  if (!href || href === "#") return true;
  const h = href.replace(/\/$/, "");
  return h === "https://www.tradingview.com/news" || h === "https://www.tradingview.com";
}

function rowHtml(cards: string[], hidden: boolean): string {
  const classes = [
    "l-section",
    "wpb_row",
    "us_custom_e515127f",
    "height_medium",
    "cr-press-combined",
  ];
  if (hidden) classes.push("press_hide");
  return `<section class="${classes.join(" ")}"><div class="l-section-h i-cf"><div class="g-cols vc_row via_flex valign_middle type_default stacking_default">${cards.join("")}</div></div></section>`;
}

const LOAD_MORE_HTML = `<section class="l-section wpb_row height_medium cr-press-loadmore">
<div class="l-section-h i-cf"><div class="g-cols vc_row via_flex valign_middle type_default stacking_default">
<div class="vc_col-sm-12 wpb_column vc_column_container"><div class="vc_column-inner"><div class="wpb_wrapper">
<div class="w-btn-wrapper align_center">
<button class="w-btn us-btn-style_1 us_custom_7d601e63 has_text_color" id="loadMore" type="button"><span class="w-btn-label">Load More</span></button>
</div></div></div></div></div></div>
</section>
<script type="text/javascript">
(function(){
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function reveal(el){
    if (window.jQuery) { window.jQuery(el).slideDown(); }
    else { el.style.display = 'block'; }
  }
  ready(function(){
    var btn = document.getElementById('loadMore');
    if(!btn) return;
    btn.addEventListener('click', function(e){
      e.preventDefault();
      var hidden = Array.prototype.filter.call(document.querySelectorAll('section.cr-press-combined.press_hide'), function(el){
        return window.getComputedStyle(el).display === 'none';
      });
      hidden.slice(0, 4).forEach(reveal);
      var left = Array.prototype.filter.call(document.querySelectorAll('section.cr-press-combined.press_hide'), function(el){
        return window.getComputedStyle(el).display === 'none';
      });
      if(left.length === 0){
        var label = btn.querySelector('.w-btn-label');
        if(label) label.textContent = 'No Content';
        else btn.textContent = 'No Content';
        btn.classList.add('noContent');
        btn.disabled = true;
      }
    });
  });
})();
</script>`;

const SPACING_STYLE = `<style id="cr-press-moved-spacing">
.cr-press-combined .cr-press-post-card .cr-press-featured-img { margin-bottom: 15px !important; width: 100% !important; max-width: 100% !important; background: transparent !important; }
.cr-press-combined .cr-press-post-card .cr-press-featured-img .w-image-h { width: 100% !important; max-width: 100% !important; }
.cr-press-combined .cr-press-post-card .cr-press-featured-img img { width: 100% !important; max-width: 100% !important; height: auto !important; display: block; border-radius: 8px; }
.cr-press-combined .cr-press-post-card .us_custom_55c766a6 { padding-top: 15px !important; margin-top: 0 !important; }
.cr-press-combined .cr-press-post-card .vc_column-inner.us_custom_70f9d2ac { padding: 1.5rem !important; border-radius: 15px; height: 100%; box-sizing: border-box; }
.cr-press-loadmore #loadMore.noContent { opacity: 0.6; pointer-events: none; }
</style>`;

function updateFeaturedSection($: cheerio.CheerioAPI, featured: FeedCard | null) {
  if (!featured) return;
  const $feat = $("section.us_custom_869a0fec").first();
  if (!$feat.length) return;

  const $logo = $feat.find(".us_custom_cca0638a img").first();
  if ($logo.length && featured.img) {
    $logo.attr("src", featured.img);
    $logo.removeAttr("srcset").removeAttr("sizes").removeAttr("height");
    $logo.attr("width", "300");
    $logo.attr("alt", featured.title);
  }

  const $title = $feat.find(".us_custom_55c766a6 p").first();
  if ($title.length) $title.text(featured.title);

  const $excerpt = $feat.find(".us_custom_ec2ef2b2 p").first();
  if ($excerpt.length) $excerpt.text(featured.excerpt || featured.title);

  const $a = $feat.find("a.w-btn").first();
  if ($a.length) {
    $a.attr("href", featured.href);
    $a.find(".w-btn-label").text("Read More");
    if (featured.isExternal) {
      $a.attr("rel", "nofollow noopener");
      $a.attr("target", "_blank");
    } else {
      $a.removeAttr("rel").removeAttr("target");
    }
  }
}

/**
 * Rebuild `/press/` body: keep chrome + external media cards, inject all
 * press-release posts as internal cards, sort newest-first, one Load More.
 */
export function rebuildPressListingHtml(bodyHtml: string): string {
  const $ = cheerio.load(bodyHtml, { xml: { decodeEntities: false } } as any);
  const $main = $("#page-content");
  if (!$main.length) return bodyHtml;

  const externalCards: FeedCard[] = [];
  $main.find(".box_r2").each((_, el) => {
    const $card = $(el);
    if ($card.hasClass("cr-press-post-card")) return;
    const title = $card.find(".us_custom_55c766a6 p").first().text().trim();
    const excerpt = $card.find(".us_custom_ec2ef2b2 p").first().text().trim();
    const dateText = $card.find(".us_custom_ec7802d3 p").first().text().trim();
    const $a = $card.find("a.w-btn").first();
    const href = $a.attr("href") || "";
    const img = $card.find("img").first().attr("src") || "";
    externalCards.push({
      date: parseCardDate(dateText),
      html: $.html($card),
      title,
      href,
      img,
      excerpt,
      isInternal: false,
      isExternal: /^https?:\/\//i.test(href),
    });
  });

  const internalCards: FeedCard[] = getPressReleasePosts().map((post) => ({
    date: new Date(post.date),
    html: renderPressReleaseCardHtml(post),
    title: stripHtml(post.title),
    href: normalizePath(post.path || pressReleasePath(post.slug)),
    img: cardImageSrc(post),
    excerpt: excerptForCard(post),
    isInternal: true,
    isExternal: false,
  }));

  const feed = [...externalCards, ...internalCards].sort(
    (a, b) => +b.date - +a.date,
  );

  const featured =
    feed.find((c) => c.href && !isWeakHref(c.href)) || feed[0] || null;

  const headers: string[] = [];
  let ctaHtml = "";
  let contactHtml = "";

  $main.children("section").each((_, el) => {
    const $sec = $(el);
    const cls = ($sec.attr("class") || "").toString();
    if (
      cls.includes("cr-press-combined") ||
      cls.includes("cr-press-loadmore") ||
      cls.includes("us_custom_e515127f")
    ) {
      return;
    }
    if (cls.includes("us_custom_2f373396")) {
      ctaHtml = $.html($sec);
      return;
    }
    if (cls.includes("last_row") || cls.includes("us_custom_21b1e269")) {
      contactHtml = $.html($sec);
      return;
    }
    if (
      cls.includes("us_custom_099d1b12") ||
      cls.includes("us_custom_c261acad") ||
      cls.includes("us_custom_869a0fec")
    ) {
      headers.push($.html($sec));
    }
  });

  // Apply featured update on a temporary parse of headers
  const headerDoc = cheerio.load(`<div id="hdr">${headers.join("")}</div>`, {
    xml: { decodeEntities: false },
  } as any);
  updateFeaturedSection(headerDoc, featured);
  const headerHtml = headerDoc("#hdr").html() || headers.join("");

  const rows: string[] = [];
  for (let i = 0; i < feed.length; i += 2) {
    const pair = feed.slice(i, i + 2).map((c) => c.html);
    rows.push(rowHtml(pair, i / 2 >= INITIAL_VISIBLE_ROWS));
  }

  const parts: string[] = [SPACING_STYLE, headerHtml];
  if (ctaHtml && rows.length >= 2) {
    parts.push(rows[0], rows[1], ctaHtml, ...rows.slice(2));
  } else {
    parts.push(...rows);
    if (ctaHtml) parts.push(ctaHtml);
  }
  parts.push(LOAD_MORE_HTML);
  if (contactHtml) parts.push(contactHtml);

  return `<main id="page-content" class="l-main" itemprop="mainContentOfPage">${parts.join("\n")}</main>`;
}

/**
 * Extract article HTML for the shared blog/post template.
 * Prefer the main content section from mirrored Impreza singles; otherwise return as-is.
 */
export function extractPressReleaseArticleHtml(bodyHtml: string): string {
  if (!bodyHtml) return "";
  const $ = cheerio.load(bodyHtml, { xml: { decodeEntities: false } } as any);
  const $main = $("#page-content");
  if (!$main.length) return bodyHtml;

  // Typical mirrored PR: hero (p_r1) + body (p_r2) + related
  const $body = $main.find("section.p_r2, section.us_custom_4fb9e5a3").first();
  if ($body.length) {
    return ($body.find(".l-section-h").html() || $body.html() || "").trim() || bodyHtml;
  }

  const sections = $main.children("section").toArray();
  if (sections.length >= 2) {
    const $sec = $(sections[1]);
    return ($sec.find(".l-section-h").html() || $sec.html() || "").trim() || bodyHtml;
  }

  return ($main.html() || bodyHtml).trim();
}

/**
 * Normalize a press-release post entry for save/create flows.
 * Reusable for CMS and scripts — always uses `/press/{slug}/`.
 */
export function applyPressReleasePaths<T extends Partial<PostEntry>>(
  post: T,
  slug?: string,
): T {
  const s = String(slug || post.slug || "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/^press\/|^press-release\//, "");
  const path = pressReleasePath(s);
  const prevSeo = (post.seo || {}) as PostEntry["seo"];
  return {
    ...post,
    type: PRESS_RELEASE_TYPE,
    slug: s,
    path,
    link: path,
    seo: {
      title: prevSeo.title || "",
      description: prevSeo.description || "",
      ...prevSeo,
      canonical: path,
    },
  };
}
