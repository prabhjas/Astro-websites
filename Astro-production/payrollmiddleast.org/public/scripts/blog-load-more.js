/**
 * Payroll Middle East Insights Load More — replaces WP Ele Custom Skin admin-ajax.
 * Targets .ecs-load-more-button + .ecs-posts.elementor-posts-container on /insights/.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function findLoadMoreGrid(nav) {
    var widget = nav.closest('.elementor-widget-posts, .elementor-element');
    if (widget) {
      var inWidget = widget.querySelector('.ecs-posts.elementor-posts-container');
      if (inWidget) return inWidget;
    }

    var el = nav;
    while (el) {
      var prev = el.previousElementSibling;
      while (prev) {
        if (prev.matches && prev.matches('.ecs-posts.elementor-posts-container')) return prev;
        var nested = prev.querySelector && prev.querySelector('.ecs-posts.elementor-posts-container');
        if (nested) {
          var all = prev.querySelectorAll('.ecs-posts.elementor-posts-container');
          return all[all.length - 1];
        }
        prev = prev.previousElementSibling;
      }
      el = el.parentElement;
      if (el && el.classList && el.classList.contains('elementor')) break;
    }

    var grids = document.querySelectorAll('.ecs-posts.elementor-posts-container');
    return grids.length ? grids[grids.length - 1] : null;
  }

  function parseSettings(el) {
    if (!el) return {};
    try {
      var raw = el.getAttribute('data-settings') || '{}';
      return JSON.parse(raw.replace(/&quot;/g, '"')) || {};
    } catch (_) {
      return {};
    }
  }

  function existingSlugs(grid) {
    var set = {};
    grid.querySelectorAll('article.ecs-post-loop a[href]').forEach(function (link) {
      try {
        var path = new URL(link.getAttribute('href'), window.location.origin).pathname;
        var slug = path.replace(/^\/|\/$/g, '');
        if (slug && slug.indexOf('/') < 0) set[slug] = true;
      } catch (_) {}
    });
    return Object.keys(set);
  }

  ready(function () {
    // Disable broken WP ECS ajax (admin-ajax is not available on Astro).
    try {
      window.ECS_load_next_page = function () {};
    } catch (_) {}

    var navs = document.querySelectorAll('.ecs-load-more-button');
    if (!navs.length) return;

    navs.forEach(function (nav) {
      var grid = findLoadMoreGrid(nav);
      if (!grid) return;

      var btn = nav.querySelector('a.elementor-button, a[role="button"], a, button');
      if (!btn) return;

      var gridSettings = parseSettings(grid);
      var btnSettings = parseSettings(nav);
      // Prefer counting cards already on the page (first paint = page size).
      var initialCount = existingSlugs(grid).length;
      var perPage =
        Number(nav.getAttribute('data-per-page')) ||
        Number(gridSettings.posts_per_page) ||
        initialCount ||
        12;

      var loading = false;
      var defaultLabel =
        (btnSettings.text || (btn.textContent || 'Load More').trim() || 'Load More');
      var loadingLabel = (btnSettings.loading_text || 'Loading...').trim() || 'Loading...';

      function setLabel(text) {
        var span = btn.querySelector('span');
        if (span) span.textContent = text;
        else btn.textContent = text;
      }

      function onClick(event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
        if (loading || nav.hidden || nav.classList.contains('done')) return;
        loading = true;
        nav.classList.add('loading');
        setLabel(loadingLabel);

        var exclude = existingSlugs(grid);
        var url =
          '/api/blog/load-more/?format=ecs&page=1&perPage=' +
          encodeURIComponent(String(perPage)) +
          '&excludeSlugs=' +
          encodeURIComponent(exclude.join(','));

        fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
          .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          })
          .then(function (data) {
            if (!data || !data.ok || typeof data.html !== 'string') throw new Error('bad payload');
            if (data.html.trim()) grid.insertAdjacentHTML('beforeend', data.html);

            // Keep ECS data-settings page counter in sync for any leftover handlers.
            try {
              var s = parseSettings(grid);
              s.current_page = Number(s.current_page || 1) + 1;
              grid.setAttribute('data-settings', JSON.stringify(s));
            } catch (_) {}

            if (data.hasMore) {
              setLabel(defaultLabel);
              if (btn.tagName === 'A') {
                btn.setAttribute('href', 'javascript:void(0)');
              }
            } else {
              nav.classList.add('done');
              nav.hidden = true;
              nav.style.display = 'none';
            }
          })
          .catch(function (err) {
            console.error('[payroll-ecs-load-more]', err);
            setLabel(defaultLabel);
          })
          .finally(function () {
            loading = false;
            nav.classList.remove('loading');
          });
      }

      btn.addEventListener('click', onClick, true);
      if (btn.tagName === 'A') btn.setAttribute('href', 'javascript:void(0)');
      // Stop ECS plugin from rewriting href back to ECS_load_next_page
      btn.setAttribute('onclick', 'return false;');
    });
  });
})();
