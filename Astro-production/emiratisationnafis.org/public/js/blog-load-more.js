/**
 * Emiratisation Nafis Blog — More Articles (replaces WP ECS admin-ajax).
 * Supports blog + author archives via data-author on the load-more nav.
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

  function bindNav(nav) {
    if (!nav || nav.dataset.csLoadMoreBound === '1') return;
    var grid = findLoadMoreGrid(nav);
    if (!grid) return;

    var btn = nav.querySelector('a.elementor-button, a, button');
    if (!btn) return;

    nav.dataset.csLoadMoreBound = '1';

    // Prefer Astro handler over leftover ECS admin-ajax.
    try {
      window.ECS_load_next_page = function () {
        loadMore();
      };
    } catch (e) {}

    var nextPage = Number(nav.getAttribute('data-next-page') || '2') || 2;
    var perPage = Number(nav.getAttribute('data-per-page') || '9') || 9;
    var offset = Number(nav.getAttribute('data-offset') || String(perPage)) || perPage;
    var author = (nav.getAttribute('data-author') || '').trim();
    var loading = false;
    var defaultLabel = (btn.textContent || 'Load More').trim() || 'Load More';
    var loadingLabel =
      (nav.getAttribute('data-loading-text') || 'Loading...').trim() || 'Loading...';

    function setLabel(text) {
      var span = btn.querySelector('span');
      if (span) span.textContent = text;
      else btn.textContent = text;
    }

    function loadMore(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      }
      if (loading || nav.hidden) return;
      loading = true;
      setLabel(loadingLabel);

      var url =
        '/api/blog/load-more/?page=' +
        encodeURIComponent(String(nextPage)) +
        '&perPage=' +
        encodeURIComponent(String(perPage)) +
        '&offset=' +
        encodeURIComponent(String(offset));
      if (author) url += '&author=' + encodeURIComponent(author);

      fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.ok || typeof data.html !== 'string') throw new Error('bad payload');
          if (data.html) grid.insertAdjacentHTML('beforeend', data.html);
          if (data.hasMore && data.nextPage) {
            nextPage = data.nextPage;
            nav.setAttribute('data-next-page', String(nextPage));
            if (btn.tagName === 'A') btn.setAttribute('href', 'javascript:void(0)');
            setLabel(defaultLabel);
          } else {
            nav.hidden = true;
            nav.style.display = 'none';
          }
        })
        .catch(function (err) {
          console.error('[cs-blog-load-more]', err);
          setLabel(defaultLabel);
        })
        .finally(function () {
          loading = false;
        });
    }

    btn.addEventListener('click', loadMore, true);
    btn.setAttribute('href', 'javascript:void(0)');
    btn.setAttribute('role', 'button');
  }

  function boot() {
    document
      .querySelectorAll('[data-cs-blog-load-more], nav.ecs-load-more-button')
      .forEach(bindNav);
  }

  ready(boot);
  ready(function () {
    setTimeout(boot, 0);
    setTimeout(boot, 500);
    setTimeout(boot, 1500);
  });
})();
