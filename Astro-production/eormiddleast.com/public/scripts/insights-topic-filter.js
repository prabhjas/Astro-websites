/**
 * Insights "Articles by Topic" filter + pagination.
 * Must load after jQuery (ElementorScripts).
 */
(() => {
  if (window.__EOR_INSIGHTS_FILTER_BOOTED__) return;
  window.__EOR_INSIGHTS_FILTER_BOOTED__ = true;

  const PER_PAGE = 12;

  function waitFor(fn, maxMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function tick() {
        if (fn()) {
          resolve(true);
          return;
        }
        if (Date.now() - start > (maxMs || 8000)) {
          resolve(false);
          return;
        }
        setTimeout(tick, 40);
      })();
    });
  }

  function ensurePaginationPlugin($) {
    return new Promise((resolve) => {
      if (typeof $.fn.pagination === "function") {
        resolve(true);
        return;
      }
      const existing = document.querySelector('script[src*="simplePagination"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(typeof $.fn.pagination === "function"));
        setTimeout(() => resolve(typeof $.fn.pagination === "function"), 1500);
        return;
      }
      const s = document.createElement("script");
      s.src = "/scripts/jquery.simplePagination.min.js";
      s.onload = () => resolve(typeof $.fn.pagination === "function");
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  function visibleItems($items) {
    return $items.filter(":visible");
  }

  function setupPagination($, $allItems, $pager) {
    if (!$pager.length) return;

    // Destroy prior instance if any
    try {
      if ($pager.data("pagination")) $pager.pagination("destroy");
    } catch {
      /* ignore */
    }
    $pager.empty();

    const $items = visibleItems($allItems);
    const numItems = $items.length;

    if (numItems <= PER_PAGE) {
      $items.show();
      $pager.hide();
      return;
    }

    $pager.show();
    $items.hide().slice(0, PER_PAGE).show();

    if (typeof $.fn.pagination !== "function") {
      // Fallback: show all when plugin missing
      $items.show();
      $pager.hide();
      return;
    }

    $pager.pagination({
      items: numItems,
      itemsOnPage: PER_PAGE,
      prevText: "&laquo;",
      nextText: "&raquo;",
      cssStyle: "light-theme",
      onPageClick: function (pageNumber) {
        const showFrom = PER_PAGE * (pageNumber - 1);
        const showTo = showFrom + PER_PAGE;
        $items.hide().slice(showFrom, showTo).show();
        try {
          $pager[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch {
          /* ignore */
        }
      },
    });
  }

  async function boot() {
    const ready = await waitFor(() => window.jQuery, 8000);
    if (!ready) return;
    const $ = window.jQuery;

    const $buttons = $(".filter-button");
    const $items = $(".post-grid.filter, .post-grid.filter ");
    // Prefer cards that have both post-grid and filter classes
    const $cards = $(".loop-wrap .post-grid").length
      ? $(".loop-wrap .post-grid")
      : $(".post-grid");
    const $pager = $("#pagination-container");

    if (!$buttons.length || !$cards.length) return;

    await ensurePaginationPlugin($);

    // Initial: ALL + paginate
    $cards.show();
    setupPagination($, $cards, $pager);
    $buttons.removeClass("active");
    $buttons.filter('[data-filter="all"]').addClass("active");

    $buttons.off("click.eorInsights").on("click.eorInsights", function (e) {
      e.preventDefault();
      const value = String($(this).attr("data-filter") || "all");

      $buttons.removeClass("active");
      $(this).addClass("active");

      if (value === "all") {
        $cards.show();
        setupPagination($, $cards, $pager);
        return;
      }

      $cards.hide();
      $cards.filter("." + value).show();
      // Category view: show all matching (live hides pager)
      $pager.hide();
      try {
        if ($pager.data("pagination")) $pager.pagination("destroy");
      } catch {
        /* ignore */
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
