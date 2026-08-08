/**
 * /law/ Load More — Elementor ECS admin-ajax replacement.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var path = (location.pathname || '').replace(/\/+$/, '') || '/';
    if (path !== '/law') return;

    var nav = document.querySelector('.ecs-load-more-button');
    if (!nav) return;

    var grid = document.querySelector('.ecs-posts.elementor-posts-container');
    if (!grid) return;

    var btn = nav.querySelector('a.elementor-button, a, button');
    if (!btn) return;

    var nextPage = 2;
    var perPage = 6;
    var offset = Number(grid.querySelectorAll('article.ecs-post-loop').length) || 6;
    var loading = false;
    var defaultLabel = (btn.textContent || 'Load More').trim() || 'Load More';

    function setLabel(text) {
      var span = btn.querySelector('.elementor-button-text, span');
      if (span) span.textContent = text;
      else btn.textContent = text;
    }

    // Capture phase so we win over ECS_load_next_page (WP admin-ajax).
    btn.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (loading || nav.hidden) return;
        loading = true;
        setLabel('Loading...');

        var url =
          '/api/blog/load-more/?type=law&page=' +
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
              setLabel(defaultLabel);
            } else {
              nav.hidden = true;
              nav.style.display = 'none';
            }
          })
          .catch(function (err) {
            console.error('[cfs-law-load-more]', err);
            setLabel(defaultLabel);
          })
          .finally(function () {
            loading = false;
          });
      },
      true,
    );
  });
})();
