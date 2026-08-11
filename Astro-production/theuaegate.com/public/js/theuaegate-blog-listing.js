/**
 * The UAE Gate Insights listing — replaces WP admin-ajax get_blog_posts.
 * Matches Impreza-child/custom-scripts.js card markup + category filters + #pagination.
 */
(function () {
  function boot($) {
    if (!$ || !$("#blog-list").length) return;

    // Prevent the WP theme script from double-binding if it still loads.
    $(".category-btn").off("click");
    $("#pagination").off("click");

    var currentPage = 1;
    var postsPerPage = 9;
    var endpoint = "/api/blog/listing/";

    window.ajax_object = window.ajax_object || {};
    window.ajax_object.ajax_url = endpoint;

    function displayPosts(posts) {
      var blogList = $("#blog-list");
      blogList.empty();
      $.each(posts || [], function (_index, post) {
        var postDiv = $('<div class="post">');
        postDiv.append(
          '<a href="' +
            post.link +
            '"><div class="articlepostthumbnailurl"><img src="' +
            (post.thumbnail || "") +
            '" alt=""/></div></a>',
        );
        postDiv.append(
          '<div class="innerpost_wrapper"><div class="authorwrapper"><div class="postcategory">' +
            (post.author || "") +
            '</div><div class="postdate">' +
            (post.date || "") +
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
      var pagination = $("#pagination");
      pagination.empty();
      var category = $(".category-btn.active").data("category") || "all";
      $.ajax({
        url: endpoint,
        type: "POST",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({
          action: "get_blog_posts",
          category: category,
          page: currentPage,
          posts_per_page: postsPerPage,
        }),
        success: function (response) {
          displayPosts((response && response.posts) || []);
          pagination.html((response && response.pagination) || "");
          pagination
            .find(".page-numbers")
            .off("click")
            .on("click", function (e) {
              e.preventDefault();
              var n = parseInt($(this).text(), 10);
              if (!isNaN(n)) {
                currentPage = n;
                paginatePosts();
                try {
                  document.getElementById("blog-list").scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                } catch (_) {}
              }
            });
        },
        error: function (xhr, status, err) {
          console.error("[theuaegate-blog-listing]", status, err);
        },
      });
    }

    function filterPosts(category) {
      $(".category-btn").removeClass("active");
      $('.category-btn[data-category="' + category + '"]').addClass("active");
      currentPage = 1;
      paginatePosts();
    }

    $(".category-btn").on("click", function () {
      filterPosts($(this).data("category"));
    });

    filterPosts("all");
  }

  function waitForJQuery(attempts) {
    if (window.jQuery) {
      window.jQuery(function () {
        boot(window.jQuery);
      });
      return;
    }
    if (attempts <= 0) {
      console.warn("[theuaegate-blog-listing] jQuery not available");
      return;
    }
    setTimeout(function () {
      waitForJQuery(attempts - 1);
    }, 50);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      waitForJQuery(40);
    });
  } else {
    waitForJQuery(40);
  }
})();
