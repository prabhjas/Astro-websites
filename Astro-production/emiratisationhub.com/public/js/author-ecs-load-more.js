/**
 * Author archive Load More — replaces broken WP ECS admin-ajax (which returns "0").
 * Loads further posts from /api/blog/load-more and shows "No more post found" when done.
 */
(function () {
  var path = window.location.pathname || '';
  var match = path.match(/^\/author\/([^/]+)\/?$/i);
  if (!match) return;
  var authorSlug = decodeURIComponent(match[1]).toLowerCase();
  if (!authorSlug || authorSlug === 'page') return;

  var NO_MORE = 'No more post found';
  var loading = false;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function postsContainer() {
    return (
      document.querySelector('.elementor-widget-archive-posts .ecs-posts') ||
      document.querySelector('.ecs-posts.elementor-posts-container') ||
      document.querySelector('[data-emiratisationhub-author-posts]')
    );
  }

  function loadMoreButton() {
    return (
      document.querySelector('.ecs-load-more-button') ||
      document.querySelector('[data-emiratisationhub-author-load-more]')
    );
  }

  function buttonLabelEl(btn) {
    if (!btn) return null;
    return (
      btn.querySelector('.elementor-button-text') ||
      btn.querySelector('.elementor-button span') ||
      btn.querySelector('.elementor-button') ||
      btn.querySelector('span') ||
      btn
    );
  }

  function existingSlugs(container) {
    var slugs = [];
    container.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var m = href.match(/^\/([^/#?]+)\/?$/);
      if (!m) return;
      var slug = m[1].toLowerCase();
      if (
        slug === 'author' ||
        slug === 'category' ||
        slug === 'tag' ||
        slug === 'blog' ||
        slug === 'contact-us' ||
        slug.indexOf('wp-') === 0
      ) {
        return;
      }
      if (slugs.indexOf(slug) === -1) slugs.push(slug);
    });
    return slugs;
  }

  function showNoMore(btn) {
    var msg = document.createElement('p');
    msg.className = 'emiratisationhub-author-no-more';
    msg.setAttribute('role', 'status');
    msg.textContent = NO_MORE;
    msg.style.cssText =
      'text-align:center;margin:28px 0 8px;color:#666;font-size:16px;font-family:Poppins,sans-serif;';

    // Remove stray "0" text nodes ECS may have appended earlier.
    var container = postsContainer();
    if (container) {
      Array.prototype.slice.call(container.childNodes).forEach(function (node) {
        if (node.nodeType === 3 && String(node.textContent || '').trim() === '0') {
          container.removeChild(node);
        } else if (
          node.nodeType === 1 &&
          !node.querySelector &&
          String(node.textContent || '').trim() === '0' &&
          node.children &&
          node.children.length === 0
        ) {
          container.removeChild(node);
        }
      });
      // Also strip a lone text "0" glued after last article
      container.innerHTML = container.innerHTML.replace(/(<\/article>)\s*0\s*$/i, '$1');
    }

    if (btn && btn.parentNode) {
      btn.parentNode.insertBefore(msg, btn);
      btn.remove();
    } else if (container && container.parentNode) {
      container.parentNode.appendChild(msg);
    }
  }

  function setLabel(btn, text) {
    var el = buttonLabelEl(btn);
    if (el) el.textContent = text;
  }

  function wire() {
    var container = postsContainer();
    var btn = loadMoreButton();
    if (!container || !btn || btn.dataset.astroAuthorLoadMore === '1') return;
    btn.dataset.astroAuthorLoadMore = '1';

    // Stop ECS / WP admin-ajax from appending literal "0".
    window.ECS_load_next_page = function () {
      /* replaced by Astro author load-more */
    };

    var defaultLabel =
      (buttonLabelEl(btn) && buttonLabelEl(btn).textContent) ||
      btn.getAttribute('data-text') ||
      'Load More Posts';
    defaultLabel = String(defaultLabel).trim() || 'Load More Posts';

    var clickTarget =
      btn.querySelector('a.elementor-button, a.elementor-button-link, a, button') || btn;

    if (clickTarget.tagName === 'A') {
      clickTarget.setAttribute('href', '#');
    }

    clickTarget.addEventListener(
      'click',
      function (ev) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        if (loading) return;
        loading = true;
        setLabel(btn, 'Loading...');

        var exclude = existingSlugs(container);
        var url =
          '/api/blog/load-more/?slug=' +
          encodeURIComponent(authorSlug) +
          '&exclude=' +
          encodeURIComponent(exclude.join(',')) +
          '&limit=10';

        fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
          .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          })
          .then(function (data) {
            var html = data && typeof data.html === 'string' ? data.html.trim() : '';
            if (html && html !== '0') {
              container.insertAdjacentHTML('beforeend', html);
            }
            if (!data || !data.hasMore || !html || html === '0') {
              showNoMore(btn);
              return;
            }
            setLabel(btn, defaultLabel);
          })
          .catch(function () {
            showNoMore(btn);
          })
          .finally(function () {
            loading = false;
          });
      },
      true,
    );
  }

  ready(function () {
    wire();
    setTimeout(wire, 600);
    setTimeout(wire, 1800);
  });
})();
