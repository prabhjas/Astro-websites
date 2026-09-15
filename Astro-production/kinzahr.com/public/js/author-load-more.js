/**
 * Author archive Load More — appends more article cards for /author/{slug}/.
 */
(function () {
  var path = window.location.pathname || '';
  var match = path.match(/^\/author\/([^/]+)\/?$/i);
  if (!match) return;
  var authorSlug = decodeURIComponent(match[1]).toLowerCase();
  if (!authorSlug || authorSlug === 'page') return;

  var loading = false;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var btn = document.querySelector('[data-kinza-author-load-more]');
    var container = document.querySelector('[data-kinza-author-posts]');
    if (!btn || !container) return;

    btn.addEventListener('click', function () {
      if (loading) return;
      var offset = Number(btn.getAttribute('data-offset') || '0') || 0;
      var total = Number(btn.getAttribute('data-total') || '0') || 0;
      if (offset >= total) {
        btn.classList.add('is-hidden');
        return;
      }

      loading = true;
      btn.disabled = true;
      var prev = btn.textContent;
      btn.textContent = 'Loading…';

      var url =
        '/api/blog/load-more/?author=' +
        encodeURIComponent(authorSlug) +
        '&offset=' +
        encodeURIComponent(String(offset)) +
        '&perPage=6&page=1';

      fetch(url, { headers: { Accept: 'application/json' } })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.ok || !data.html) {
            throw new Error((data && data.message) || 'Load failed');
          }
          var wrap = document.createElement('div');
          wrap.innerHTML = data.html;
          while (wrap.firstChild) container.appendChild(wrap.firstChild);

          var nextOffset = offset + (data.count || 0);
          btn.setAttribute('data-offset', String(nextOffset));
          if (!data.hasMore || nextOffset >= total) {
            btn.classList.add('is-hidden');
          } else {
            btn.disabled = false;
            btn.textContent = prev || 'Load More';
          }
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = prev || 'Load More';
        })
        .finally(function () {
          loading = false;
        });
    });
  });
})();
