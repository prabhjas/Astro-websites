/**
 * Emiratisation Gateway blog listing — replaces WP admin-ajax get_blog_posts.
 * Matches astra-child-theme/custom-scripts.js card markup + category filters.
 */
(function () {
  function boot($) {
    if (!$ || !$('#blog-list').length) return;

    var currentPage = 1;
    var postsPerPage = 9;
    var endpoint = '/api/blog/listing';

    function displayPosts(posts) {
      var blogList = $('#blog-list');
      blogList.empty();
      $.each(posts || [], function (_index, post) {
        var postDiv = $('<div class="post">');
        postDiv.append(
          '<a href="' +
            post.link +
            '"><div class="articlepostthumbnailurl"><img src="' +
            post.thumbnail +
            '" alt=""/></div></a>',
        );
        postDiv.append(
          '<div class="innerpost_wrapper"><div class="authorwrapper"><div class="postcategory">' +
            (post.author || '') +
            '</div><div class="postdate">' +
            (post.date || '') +
            '</div></div><div class="postlistingwrap"><a href="' +
            post.link +
            '"><h2>' +
            post.title +
            '</h2></a></div><div class="bloglistingfooterwrap"><div class="link"><a href="' +
            post.link +
            '"><i class="fa fa-arrow-right" aria-hidden="true"></i></a></div></div></div>',
        );
        blogList.append(postDiv);
      });
    }

    function paginatePosts() {
      var pagination = $('#pagination');
      pagination.empty();
      var category = $('.category-btn.active').data('category') || 'all';
      $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
          action: 'get_blog_posts',
          category: category,
          page: currentPage,
          posts_per_page: postsPerPage,
        }),
        success: function (response) {
          displayPosts(response.posts);
          pagination.html(response.pagination || '');
          pagination.find('.page-numbers').off('click').on('click', function (e) {
            e.preventDefault();
            var n = parseInt($(this).text(), 10);
            if (!isNaN(n)) {
              currentPage = n;
              paginatePosts();
              try {
                document.getElementById('blog-list').scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              } catch (_) {}
            }
          });
        },
      });
    }

    function filterPosts(category) {
      $('.category-btn').removeClass('active');
      $('.category-btn[data-category="' + category + '"]').addClass('active');
      currentPage = 1;
      paginatePosts();
    }

    $('.category-btn').off('click').on('click', function () {
      filterPosts($(this).data('category'));
    });

    window.ajax_object = window.ajax_object || {};
    window.ajax_object.ajax_url = endpoint;

    filterPosts('all');
  }

  function waitForJQuery(attempts) {
    if (window.jQuery) {
      window.jQuery(function () {
        boot(window.jQuery);
      });
      return;
    }
    if (attempts <= 0) return;
    setTimeout(function () {
      waitForJQuery(attempts - 1);
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      waitForJQuery(40);
    });
  } else {
    waitForJQuery(40);
  }
})();
