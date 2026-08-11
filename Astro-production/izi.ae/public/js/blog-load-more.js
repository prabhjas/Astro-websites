/**
 * IZI Rent a Car Insights Load More — replaces WP ECS admin-ajax.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function findLoadMoreGrid(nav) {
    // Prefer the ECS grid that belongs to the same posts widget as the Load More nav.
    var widget = nav.closest('.elementor-widget-posts, .elementor-element');
    if (widget) {
      var inWidget = widget.querySelector('.ecs-posts.elementor-posts-container');
      if (inWidget) return inWidget;
    }

    // Walk previous siblings / ancestors for the nearest preceding ECS grid.
    var el = nav;
    while (el) {
      var prev = el.previousElementSibling;
      while (prev) {
        if (prev.matches && prev.matches('.ecs-posts.elementor-posts-container')) return prev;
        var nested = prev.querySelector && prev.querySelector('.ecs-posts.elementor-posts-container');
        if (nested) {
          // If multiple grids nested, take the last (main listing).
          var all = prev.querySelectorAll('.ecs-posts.elementor-posts-container');
          return all[all.length - 1];
        }
        prev = prev.previousElementSibling;
      }
      el = el.parentElement;
      if (el && el.classList && el.classList.contains('elementor')) break;
    }

    // Fallback: last ECS grid on the page (featured strips come first).
    var grids = document.querySelectorAll('.ecs-posts.elementor-posts-container');
    return grids.length ? grids[grids.length - 1] : null;
  }

  ready(function () {
    var nav =
      document.querySelector('[data-cs-blog-load-more]') ||
      document.querySelector('.ecs-load-more-button');
    if (!nav) return;

    var grid = findLoadMoreGrid(nav);
    if (!grid) return;

    var btn = nav.querySelector('a.elementor-button, a, button');
    if (!btn) return;

    // Disable ECS WP ajax handler if it later binds
    try {
      window.ECS_load_next_page = function () {};
    } catch (e) {}

    var nextPage = Number(nav.getAttribute('data-next-page') || '2') || 2;
    var perPage = Number(nav.getAttribute('data-per-page') || '6') || 6;
    var offset = Number(nav.getAttribute('data-offset') || '12') || 12;
    var loading = false;
    var defaultLabel = (btn.textContent || 'Load More').trim() || 'Load More';
    var loadingLabel =
      (nav.getAttribute('data-loading-text') || 'Loading...').trim() || 'Loading...';

    function setLabel(text) {
      var span = btn.querySelector('span');
      if (span) span.textContent = text;
      else btn.textContent = text;
    }

    function onClick(event) {
      event.preventDefault();
      event.stopPropagation();
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
            if (btn.tagName === 'A') {
              btn.setAttribute('href', '/blog/?page=' + nextPage);
            }
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

    btn.addEventListener('click', onClick, true);
    btn.setAttribute('href', 'javascript:void(0)');
  });
})();
