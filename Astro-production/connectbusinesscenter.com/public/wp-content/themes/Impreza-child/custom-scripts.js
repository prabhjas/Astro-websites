jQuery(document).ready(function($) {

  var currentPage = 1;
  var postsPerPage = 6; // Number of posts to load per request
  var category = 'all'; // Default category

  function displayPosts(posts) {
    var blogList = $('#blog-list');
	  
    $.each(posts, function(index, post) {

      var postDiv = $('<div class="post">');
      postDiv.append('<a href="'+ post.link +'"><div class="articlepostthumbnailurl"><img src="' + post.thumbnail + '"/></div></a>');
      postDiv.append('<div class="innerpost_wrapper"><div class="authorwrapper"><div class="postcategory">'+ post.author +'</div><div class="postdate">'+ post.date +'</div></div><div class="postlistingwrap"><a href="'+ post.link +'"><h2>'+ post.title +'</h2></a></div><div class="bloglistingfooterwrap"><div class="link"><a href="'+ post.link +'"><i class="fa fa-arrow-right"></i></a></div></div></div>');
      
      blogList.append(postDiv);
    });
  }

  function loadMorePosts() {
    $.ajax({
      url: ajax_object.ajax_url,
      type: 'POST',
      data: {
        'action': 'get_blog_posts',
        'category': category,
        'page': currentPage,
        'posts_per_page': postsPerPage
      },
      success: function(response) {
        displayPosts(response.posts);

        // Check if more posts are available
        if (!response.more_posts) {
          $('#load-more-btn').hide(); // Hide the button if no more posts
        }

        currentPage++; // Increment the page for the next request
      }
    });
  }

  function filterPosts(newCategory) {
    category = newCategory; // Update category
    currentPage = 1; // Reset page to 1
    $('#blog-list').empty(); // Clear the current posts
    $('#load-more-btn').show(); // Show the "Load More" button in case it was hidden
    loadMorePosts(); // Load posts for the selected category
  }

  // Handle category filtering
  $('.category-btn').click(function() {
    var newCategory = $(this).data('category');
    filterPosts(newCategory);
  });

  // Load more posts on button click
  $('#load-more-btn').click(function() {
    loadMorePosts();
  });

  // Initial load
  filterPosts('all'); // Load posts for the default 'all' category
});