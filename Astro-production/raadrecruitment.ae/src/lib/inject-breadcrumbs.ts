/**
 * Inject breadcrumb HTML into Elementor page/post body markup.
 *
 * - service: immediately before the first H1 heading widget
 * - post: after featured image (when before title), else before title;
 *         replace Elementor page-title widget with a visible H1 after breadcrumb
 *         (Elementor's `.elementor-page-title` is often `display:none` via --page-title-display)
 */
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

export type BreadcrumbInjectMode = "service" | "post";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findH1Widget($: cheerio.CheerioAPI) {
  const h1 = $("h1").first();
  if (!h1.length) return null;
  const widget = h1.closest(".elementor-element[data-widget_type]");
  return widget.length ? widget : null;
}

function findPostTitleWidget($: cheerio.CheerioAPI) {
  const widget = $('[data-widget_type="theme-post-title.default"]').first();
  return widget.length ? widget : findH1Widget($);
}

/** Featured-image widget that is a prior sibling of the title/H1 widget in the same wrap. */
function findFeaturedImageBeforeTitle($: cheerio.CheerioAPI) {
  const titleWidget = findPostTitleWidget($);
  if (!titleWidget?.length) return null;
  const wrap = titleWidget.parent();
  const siblings = wrap.children(".elementor-element").toArray() as Element[];
  const titleEl = titleWidget.get(0) as Element | undefined;
  if (!titleEl) return null;
  const titleIdx = siblings.indexOf(titleEl);
  if (titleIdx <= 0) return null;

  for (let i = titleIdx - 1; i >= 0; i--) {
    const el = siblings[i];
    const type = el.attribs?.["data-widget_type"] || "";
    if (type === "theme-post-featured-image.default") {
      return $(el as AnyNode);
    }
  }
  return null;
}

function renderVisiblePostTitle(title: string): string {
  const safe = escapeHtml(title.trim());
  if (!safe) return "";
  return `<h1 class="sp-single-post-title">${safe}</h1>`;
}

/** Place breadcrumb, then a guaranteed-visible post title H1. */
function placePostBreadcrumbAndTitle(
  $: cheerio.CheerioAPI,
  breadcrumbsHtml: string,
  fallbackTitle = "",
) {
  $(".sp-page-breadcrumbs").remove();
  $(".sp-single-post-title").remove();

  const titleWidget = findPostTitleWidget($);
  const titleText =
    (titleWidget?.find("h1").first().text() || "").trim() || fallbackTitle.trim();

  const feat = findFeaturedImageBeforeTitle($);

  if (feat?.length) {
    feat.after(breadcrumbsHtml);
  } else if (titleWidget?.length) {
    titleWidget.before(breadcrumbsHtml);
  } else {
    const h1Widget = findH1Widget($);
    if (h1Widget?.length) h1Widget.before(breadcrumbsHtml);
    else return;
  }

  // Drop Elementor title widget — `.elementor-page-title` is hidden by Elementor CSS var
  if (titleWidget?.length) {
    titleWidget.remove();
  }

  const crumb = $(".sp-page-breadcrumbs").first();
  if (!crumb.length) return;

  const titleHtml = renderVisiblePostTitle(titleText);
  if (titleHtml) crumb.after(titleHtml);
}

export function injectBreadcrumbsHtml(
  bodyHtml: string,
  breadcrumbsHtml: string,
  mode: BreadcrumbInjectMode,
  options?: { postTitle?: string },
): string {
  if (!bodyHtml || !breadcrumbsHtml) return bodyHtml;

  const $ = cheerio.load(bodyHtml, null, false);

  if (mode === "post") {
    placePostBreadcrumbAndTitle($, breadcrumbsHtml, options?.postTitle || "");
    return $.root().html() || bodyHtml;
  }

  // service
  $(".sp-page-breadcrumbs").remove();
  const h1Widget = findH1Widget($);
  if (h1Widget?.length) {
    h1Widget.before(breadcrumbsHtml);
    return $.root().html() || bodyHtml;
  }

  return bodyHtml;
}
