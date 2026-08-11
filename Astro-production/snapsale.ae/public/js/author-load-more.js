(function () {
  function boot() {
    var root = document.querySelector('[data-kpmpro-author-posts]');
    var btn = document.querySelector('[data-kpmpro-author-load-more]');
    if (!root || !btn) return;

    var slug = root.getAttribute('data-author-slug');
    var offset = parseInt(root.getAttribute('data-offset') || '0', 10);
    var perPage = parseInt(root.getAttribute('data-per-page') || '12', 10);
    var total = parseInt(root.getAttribute('data-total') || '0', 10);

    if (!slug || offset >= total) {
      btn.classList.add('is-hidden');
      return;
    }

    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Loading…';

      var url =
        '/api/author/' +
        encodeURIComponent(slug) +
        '/posts/?offset=' +
        encodeURIComponent(String(offset)) +
        '&limit=' +
        encodeURIComponent(String(perPage));

      fetch(url, { headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (data.html) {
            root.insertAdjacentHTML('beforeend', data.html);
          }
          offset = data.nextOffset != null ? data.nextOffset : offset + perPage;
          root.setAttribute('data-offset', String(offset));

          if (!data.hasMore) {
            btn.classList.add('is-hidden');
          } else {
            btn.disabled = false;
            btn.textContent = 'Load more';
          }
        })
        .catch(function (err) {
          console.error('[author-load-more]', err);
          btn.disabled = false;
          btn.textContent = 'Load more';
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
