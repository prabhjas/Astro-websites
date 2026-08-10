/**
 * The UAE Gate Insights listing — replaces WP admin-ajax get_blog_posts.
 * Matches Impreza-child/custom-scripts.js card markup + category filters + Load More.
 */
(function () {
  function boot($) {
    if (!$ || !$('#blog-list').length) return;

    // Prevent the WP theme script from double-binding if it still loads.
    $('#load-more-btn').off('click');
    $('.category-btn').off('click');

    var currentPage = 1;
    var postsPerPage = 6;
    var category = 'all';
    var endpoint = '/api/blog/listing/';
    var loading = false;

    window.ajax_object = window.ajax_object || {};
    window.ajax_object.ajax_url = endpoint;

    function displayPosts(posts, append) {
      var blogList = $('#blog-list');
      if (!append) blogList.empty();
      $.each(posts || [], function (_index, post) {
        var postDiv = $('<div class="post">');
        postDiv.append(
          '<a href="' +
            post.link +
            '"><div class="articlepostthumbnailurl"><img src="' +
            (post.thumbnail || '') +
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

    function loadMorePosts(append) {
      if (loading) return;
      loading = true;
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
          displayPosts((response && response.posts) || [], !!append);
          if (!response || !response.more_posts) {
            $('#load-more-btn').hide();
          } else {
            $('#load-more-btn').show();
          }
          currentPage += 1;
        },
        error: function (xhr, status, err) {
          console.error('[cbc-blog-listing]', status, err);
        },
        complete: function () {
          loading = false;
        },
      });
    }

    function filterPosts(newCategory) {
      category = newCategory || 'all';
      currentPage = 1;
      $('.category-btn').removeClass('active');
      $('.category-btn[data-category="' + category + '"]').addClass('active');
      $('#blog-list').empty();
      $('#load-more-btn').show();
      loadMorePosts(false);
    }

    $('.category-btn').on('click', function () {
      filterPosts($(this).data('category'));
    });

    $('#load-more-btn').on('click', function () {
      loadMorePosts(true);
    });

    filterPosts('all');
  }

  function waitForJQuery(attempts) {
    if (window.jQuery) {
      window.jQuery(function () {
        boot(window.jQuery);
      });
      return;
    }
    if (attempts <= 0) {
      console.warn('[cbc-blog-listing] jQuery not available');
      return;
    }
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
