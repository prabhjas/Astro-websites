/**
 * Render accessible breadcrumb markup (mirrors Breadcrumbs.astro).
 * Used when injecting into mirrored Elementor HTML.
 */
export type CrumbItem = { name: string; href?: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderBreadcrumbsHtml(
  items: CrumbItem[],
  wrapperClass = "sp-page-breadcrumbs sp-page-breadcrumbs--inline",
): string {
  if (!items.length) return "";
  const lis = items
    .map((item, i) => {
      const isCurrent = i === items.length - 1;
      const label = escapeHtml(item.name);
      const inner =
        !isCurrent && item.href
          ? `<a href="${escapeHtml(item.href)}">${label}</a>`
          : `<span aria-current="page">${label}</span>`;
      const sep = !isCurrent
        ? `<span class="sep" aria-hidden="true">/</span>`
        : "";
      return `<li>${inner}${sep}</li>`;
    })
    .join("");

  return `<div class="${wrapperClass}"><nav class="sp-breadcrumbs" aria-label="Breadcrumb"><ol>${lis}</ol></nav></div>`;
}
