jQuery(document).ready(function ($) {
  var currentPage = 1;
  var postsPerPage = 10;
  var ajaxUrl = (window.ajax_object && ajax_object.ajax_url) || "/api/blog/insights/";

  function displayPosts(posts) {
    var blogList = $("#blog-list");
    if (!blogList.length) return;
    blogList.empty();

    $.each(posts, function (_index, post) {
      var postDiv = $('<div class="post">');
      postDiv.append(
        '<a href="' +
          post.link +
          '"><div class="articlepostthumbnailurl"><img src="' +
          post.thumbnail +
          '" alt=""/><div class="category_and_date_wrapper"><div class="datewrap">' +
          post.date +
          '</div><div class="categorywrap">' +
          post.category +
          "</div></div></div></a>"
      );
      postDiv.append(
        '<div class="innerpost_wrapper"><div class="postlistingwrap"><a href="' +
          post.link +
          '"><h2>' +
          post.title +
          "</h2></a><p>" +
          post.excerpt +
          '</p></div><div class="bloglistingfooterwrap"><div class="link"><a href="' +
          post.link +
          '">Read Article<img src="/wp-content/uploads/2023/07/readarticleicon.svg" alt=""/></a></div></div></div>'
      );
      blogList.append(postDiv);
    });
  }

  function paginatePosts() {
    var pagination = $("#pagination");
    if (!$("#blog-list").length) return;

    $.ajax({
      url: ajaxUrl,
      type: "GET",
      dataType: "json",
      data: {
        category: $(".category-btn.active").data("category") || "all",
        page: currentPage,
        posts_per_page: postsPerPage,
      },
      success: function (response) {
        if (!response || !response.posts) return;
        displayPosts(response.posts);
        pagination.html(response.pagination || "");

        pagination.find(".page-numbers").off("click.mbsInsights").on("click.mbsInsights", function (e) {
          e.preventDefault();
          var text = $(this).text().trim();
          var num = parseInt(text, 10);
          if (!num) return;
          currentPage = num;
          paginatePosts();
          var list = document.getElementById("blog-list");
          if (list) list.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      },
      error: function (xhr) {
        console.error("[mbs-insights]", xhr && xhr.status, xhr && xhr.responseText);
      },
    });
  }

  function filterPosts(category) {
    $(".category-btn").removeClass("active");
    $('.category-btn[data-category="' + category + '"]').addClass("active");
    currentPage = 1;
    paginatePosts();
  }

  if ($("#blog-list").length) {
    $(".category-btn")
      .off("click.mbsInsights")
      .on("click.mbsInsights", function () {
        filterPosts($(this).data("category"));
      });
    filterPosts($(".category-btn.active").data("category") || "all");
  }
});
