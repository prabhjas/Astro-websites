/*
 Project name:       MODELTHEME
 Project author:     ModelTheme
 File name:          Custom JS
*/
  // oklahoma STICKY LEFT SIDE
  // if (jQuery('#oklahoma_stickit').length){
  //     jQuery("#oklahoma_stickit").sticky({
  //         topSpacing:60
  //     });
  // }

  // jQuery('#oklahoma_stickit').stickit();

jQuery( document ).ready(function() {


    jQuery('.group_pictures_holder.group_pictures_holder_existing_media.row .delete').click(function(e) {

      var selector_parent = jQuery(this).parent().attr('name');
      var selector_child = jQuery(this).attr('name');
      
      var input_ids = jQuery('#group_pictures[type=hidden]').val();

      console.log('--------------');

      var input_final;

      if (input_ids.endsWith(selector_child)) { 
        input_final = input_ids.replace(selector_child,'');
      } else if (input_ids.indexOf(',') > -1) {
         input_final = input_ids.replace(selector_child+', ','');
      } else {
          input_final = input_ids.replace(selector_child,'');
      }

      jQuery('#group_pictures[type=hidden]').attr('value', input_final);

      if(selector_parent == selector_child) {
          jQuery(this).parent().remove();     
      }         
    });



  //knowledge search
  jQuery('.mt-car-search input#keyword').on('blur', function(){
     jQuery('#datafetch').removeClass('focus');
  }).on('focus', function(){
    jQuery('#datafetch').addClass('focus');
  });

  ;( function( $, window, document, undefined )
  {
    $( '.inputfile' ).each( function()
    {
      var $input   = $( this ),
        $label   = $input.next( 'label' ),
        labelVal = $label.html();

      $input.on( 'change', function( e )
      {
        var fileName = '';

        if( this.files && this.files.length > 1 )
          fileName = ( this.getAttribute( 'data-multiple-caption' ) || '' ).replace( '{count}', this.files.length );
        else if( e.target.value )
          fileName = e.target.value.split( '\\' ).pop();

        if( fileName )
          $label.find( 'span' ).html( fileName );
        else
          $label.html( labelVal );
      });

      // Firefox bug fix
      $input
      .on( 'focus', function(){ $input.addClass( 'has-focus' ); })
      .on( 'blur', function(){ $input.removeClass( 'has-focus' ); });
    });
  })( jQuery, window, document );

});




jQuery(document).ready(function(){
  
  var stars_section = jQuery('#mt-rating-stars-parent').children('.mt-rating-stars');
  for (j = 0; j < stars_section.length; j++) {

    jQuery('#mt-rating-stars-'+j+' #stars li').on('click', function(){
      var onStar = parseInt(jQuery(this).data('value'), 10); 
      var stars = jQuery(this).parent().children('li.star');

      
      for (i = 0; i < stars.length; i++) {
        jQuery(stars[i]).removeClass('selected');
      }
      
      for (i = 0; i < onStar; i++) {
        jQuery(stars[i]).addClass('selected');
      }

      var ratingValue = parseInt(jQuery(this).parent().children('li.star.selected').last().data('value'), 10);
      jQuery(this).parent().parent().find('input').val(ratingValue);

    });


  }
  
});

/*jQuery(document).ready(function(){

        if(window.matchMedia('(min-width: 992px)').matches) {

            jQuery(".mt_listings_page.mt_listing_map_location, .high-padding-top.col-md-7").stick_in_parent({
                offset_top: 30
            });
            jQuery('.mt_listings_page.mt_listing_map_location')
            .on('sticky_kit:bottom', function(e) {
                jQuery(this).parent().css('position', 'static');
            })

        }
});*/

// LISTING GALLERY POPUP
if (jQuery('#mt_listing_single_slider').length) {
    jQuery('#mt_listing_single_slider').magnificPopup({
        delegate: 'a',
        type: 'image',
        gallery: {
            enabled: true
        },
        // other options
    });
}
jQuery('.select-car-type').select2();
jQuery('.select-car-category').select2();
jQuery('#add-new-listing .listing-select').select2();

jQuery( ".mt-car-search .row .slider-state-select.select-categories .select2-selection__arrow" ).append( "<i class='fa fa-angle-down'></i>" ); 
jQuery( ".mt-car-search .row .slider-state-select.select-locations .select2-selection__arrow" ).append( "<i class='fa fa-map-marker'></i>" );

jQuery( ".mt-listing-search-taxonomy .select-locations .select2-selection__arrow" ).append( "<i class='fa fa-map-marker'></i>" ); 

  if ( jQuery( "#grid" ).length ) {
    (function() {
      function init() {
        var speed = 300,
          easing = mina.backout;
        [].slice.call ( document.querySelectorAll( '#grid a' ) ).forEach( function( el ) {
          var s = Snap( el.querySelector( 'svg' ) ), path = s.select( 'path' ),
            pathConfig = {
              from : path.attr( 'd' ),
              to : el.getAttribute( 'data-path-hover' )
            };
          el.addEventListener( 'mouseenter', function() {
            path.animate( { 'path' : pathConfig.to }, speed, easing );
          } );
          el.addEventListener( 'mouseleave', function() {
            path.animate( { 'path' : pathConfig.from }, speed, easing );
          } );
        } );
      }
      init();
    })();
  }
// if ( jQuery( "#mt-members-slideshow" ).length ) {
//   document.documentElement.className = 'js';
//   var slideshow = new CircleSlideshow(document.getElementById('mt-members-slideshow'));
// }
(function ($) {
  'use strict';
  jQuery( document ).ready(function() {

    /* OTHER OPTION CATEGORY LISTING*/
    /* append option */
    var o = new Option("Other category", "other-category");
    jQuery("#listing_categories").append(o);
    /* other category */
    jQuery( "#listing_categories" )
    .change(function () {
      jQuery('#other-category-input').hide(); 
      var str = "";
      jQuery( "#listing_categories option:selected" ).each(function() {
        if(jQuery(this).val() == 'other-category'){
          str += jQuery( this ).text() + " ";
          jQuery('#other-category-input').show();
        }
      });
    })
    .change();

    /* OTHER OPTION LOCATION LISTING*/
    /* append option */
    var o1 = new Option("Other location", "other-location");
    jQuery("#listing_locations").append(o1);
    /* other category */
    jQuery( "#listing_locations" )
    .change(function () {
      jQuery('#other-location-input').hide(); 
      var str = "";
      jQuery( "#listing_locations option:selected" ).each(function() {
        if(jQuery(this).val() == 'other-location'){
          str += jQuery( this ).text() + " ";
          jQuery('#other-location-input').show();
        }
      });
    })
    .change();


   jQuery('#mt_listing_single_slider').slick({
      autoplay: true,
      dots: false,
      infinite: true,
      slidesToShow: 3,
      rows: 0,
      nextArrow: jQuery('#next-arrow'),
      prevArrow: jQuery('#prev-arrow'),
      responsive: [
        {
          breakpoint: 768,
          settings: {
            arrows: false,
            slidesToShow: 1
          }
        },
        {
          breakpoint: 480,
          settings: {
            arrows: false,
            slidesToShow: 1
          }
        }
      ]
  })
  .on('setPosition', function (event, slick) {
      slick.$slides.css('height', slick.$slideTrack.height() + 'px');
  });


    /*
    * ||||||||||||||||||||||||||||||||||||||||||||||||||||||||-> TESTIMONIALS01 SLIDER (Shortcode)
    */
    jQuery(".testimonials-container").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : true,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   2],
            [700,   2],
            [1000,  2],
            [1200,  2],
            [1400,  2],
            [1600,  2]
        ]
    });
    jQuery(".members-container").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        singleItem      : true,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   1],
            [700,   1],
            [1000,  1],
            [1200,  1],
            [1400,  1],
            [1600,  1]
        ]
    });
    jQuery(".testimonials-container-1").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   1],
            [700,   1],
            [1000,  1],
            [1200,  1],
            [1400,  1],
            [1600,  1]
        ]
    });
    jQuery(".testimonials-container-2").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   2],
            [700,   2],
            [1000,  2],
            [1200,  2],
            [1400,  2],
            [1600,  2]
        ]
    });
    jQuery(".testimonials-container-3").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   2],
            [700,   2],
            [1000,  3],
            [1200,  3],
            [1400,  3],
            [1600,  3]
        ]
    });
    /*
    * ||||||||||||||||||||||||||||||||||||||||||||||||||||||||-> TESTIMONIALS02 SLIDER (Shortcode)
    */
    jQuery(".testimonials02-container").owlCarousel({
      navigation      : false, // Show next and prev buttons
      pagination      : true,
      autoPlay        : true,
      slideSpeed      : 700,
      paginationSpeed : 700,
      navigationText  : ["<i class='icon-arrow-left'></i>","<i class='icon-arrow-right'></i>"],
      // navigationText  : ["",""],
      singleItem      : true
    });
    /*
    * ||||||||||||||||||||||||||||||||||||||||||||||||||||||||-> TWEETS SLIDER (Shortcode)
    */
    jQuery(".mt_tweets_slider").owlCarousel({
      navigation      : false, // Show next and prev buttons
      pagination      : false,
      autoPlay        : false,
      slideSpeed      : 700,
      paginationSpeed : 700,
      singleItem      : true
    });
    /*
    * ||||||||||||||||||||||||||||||||||||||||||||||||||||||||-> MEMBERS FANCY SLIDER (Shortcode)
    */
    jQuery(".mt_members_fancy_slider").owlCarousel({
      navigation      : false, // Show next and prev buttons
      pagination      : false,
      autoPlay        : false,
      slideSpeed      : 700,
      paginationSpeed : 700,
      autoPlay : true,
      autoPlayTimeout:10000,
      autoPlayHoverPause:true,
      itemsCustom : [
          [0,     1],
          [450,   1],
          [600,   2],
          [700,   2],
          [1000,  4],
          [1200,  4],
          [1400,  4],
          [1600,  4]
      ]
    });
    /*
    * ||||||||||||||||||||||||||||||||||||||||||||||||||||||||-> CLIENTS SLIDER (Shortcode)
    */
    jQuery(".clients_container_shortcode-1").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   1],
            [700,   1],
            [1000,  1],
            [1200,  1],
            [1400,  1],
            [1600,  1]
        ]
    });
    jQuery(".clients_container_shortcode-2").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   2],
            [700,   2],
            [1000,  2],
            [1200,  2],
            [1400,  2],
            [1600,  2]
        ]
    });
    jQuery(".clients_container_shortcode-3").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   2],
            [700,   2],
            [1000,  3],
            [1200,  3],
            [1400,  3],
            [1600,  3]
        ]
    });
    jQuery(".clients_container_shortcode-4").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   2],
            [700,   3],
            [1000,  4],
            [1200,  4],
            [1400,  4],
            [1600,  4]
        ]
    });
    jQuery(".clients_container_shortcode-5").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   2],
            [600,   2],
            [700,   5],
            [1000,  6],
            [1200,  6],
            [1400,  6],
            [1600,  6]
        ]
    });

     /*
    * ||||||||||||||||||||||||||||||||||||||||||||||||||||||||-> CLIENTS SLIDER (Shortcode)
    */
    jQuery(".icodrops_slider_container_shortcode-1").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   1],
            [700,   1],
            [1000,  1],
            [1200,  1],
            [1400,  1],
            [1600,  1]
        ]
    });
    jQuery(".icodrops_slider_container_shortcode-2").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   2],
            [700,   2],
            [1000,  2],
            [1200,  2],
            [1400,  2],
            [1600,  2]
        ]
    });
    jQuery(".icodrops_slider_container_shortcode-3").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   2],
            [700,   2],
            [1000,  3],
            [1200,  3],
            [1400,  3],
            [1600,  3]
        ]
    });
    jQuery(".icodrops_slider_container_shortcode-4").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   1],
            [600,   2],
            [700,   3],
            [1000,  4],
            [1200,  4],
            [1400,  4],
            [1600,  4]
        ]
    });
    jQuery(".icodrops_slider_container_shortcode-5").owlCarousel({
        navigation      : false, // Show next and prev buttons
        pagination      : false,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   2],
            [600,   2],
            [700,   5],
            [1000,  6],
            [1200,  6],
            [1400,  6],
            [1600,  6]
        ]
    });
    /*
    * ||||||||||||||||||||||||||||||||||||||||||||||||||||||||-> LISTINGS SLIDER (Shortcode)
    */
    jQuery(".listings-container-3").owlCarousel({
        dots : true,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   2],
            [600,   2],
            [700,   2],
            [1000,  2],
            [1200,  3],
            [1400,  3],
            [1600,  3]
        ]
    });
    jQuery(".listings-container-4").owlCarousel({
        dots : true,
        autoPlay        : false,
        slideSpeed      : 700,
        paginationSpeed : 700,
        autoPlay : true,
        autoPlayTimeout:10000,
        autoPlayHoverPause:true,
        itemsCustom : [
            [0,     1],
            [450,   2],
            [600,   2],
            [700,   3],
            [1000,  3],
            [1200,  4],
            [1400,  4],
            [1600,  4]
        ]
    });
    /*
    * ||||||||||||||||||||||||||||||||||||||||||||||||||||||||-> GET DIV HEIGHT (Shortcode) 
    */
    jQuery(document).ready( function() {
        var height = jQuery(".about_image").height();
        jQuery('.about_text_holder').css('height',height);
    });
    jQuery(document).ready( function() {
        var height = jQuery(".portfolio03_thumbnail").height();
        jQuery('.color_verlay_portfolio3').css('height',height);
    });
    jQuery(document).ready( function() {
        var height = jQuery(".color_verlay_portfolio3").height();
        jQuery('.portfolio03_title_subtitle_holder').css('height',height);
    });
    /*
    * ||||||||||||||||||||||||||||||||||||||||||||||||||||||||-> SERVICES SLIDER (Shortcode)
    */
    // SET LEFT SIDE height of RIGHT SIDE
    jQuery( '.right-side' ).ready(function() {
      var right_side_height = jQuery('.right-side').height();
      jQuery( '.left-side' ).height( right_side_height )
    });
    var sync1 = jQuery("#service_big_slides");
    var sync2 = jQuery("#service_small_slides");
   
    jQuery(".service_small_slides_holder .fa-angle-right").click(function(){
      sync1.trigger('owl.next');
    })
    jQuery(".service_small_slides_holder .fa-angle-left").click(function(){
      sync1.trigger('owl.prev');
    })
    sync1.owlCarousel({
      // mouseDrag: false,
      center:true,
      loop: true,
      navigationText:  ["<",">"],
      rewindNav: true,
      singleItem : true,
      slideSpeed : 1000,
      navigation: false,
      pagination: false,
      afterAction : syncPosition,
      responsiveRefreshRate : 200,
      afterInit : function(elem){
        this.jumpTo(1);
      }
    });
   
    sync2.owlCarousel({
      // mouseDrag: false,
      center:true,
      loop: true,
      items : 3,
      itemsDesktop      : [1199,3],
      itemsDesktopSmall     : [979,3],
      itemsTablet       : [768,3],
      itemsMobile       : [479,3],
      pagination:false,
      responsiveRefreshRate : 100,
      afterInit : function(el){
        el.find(".owl-item").eq(1).addClass("synced");
      }
    });
   
    function syncPosition(el){
      var current = this.currentItem;
      jQuery("#service_small_slides")
        .find(".owl-item")
        .removeClass("synced")
        .eq(current)
        .addClass("synced")
      if(jQuery("#service_small_slides").data("owlCarousel") !== undefined){
        center(current)
      }
    }
   
    jQuery("#service_small_slides").on("click", ".owl-item", function(e){
      e.preventDefault();
      var number = jQuery(this).data("owlItem");
      sync1.trigger("owl.goTo",number);
    });
   
    function center(number){
      var sync2visible = sync2.data("owlCarousel").owl.visibleItems;
      var num = number;
      var found = false;
      for(var i in sync2visible){
        if(num === sync2visible[i]){
          var found = true;
        }
      }
   
      if(found===false){
        if(num>sync2visible[sync2visible.length-1]){
          sync2.trigger("owl.goTo", num - sync2visible.length+2)
        }else{
          if(num - 1 === -1){
            num = 0;
          }
          sync2.trigger("owl.goTo", num);
        }
      } else if(num === sync2visible[sync2visible.length-1]){
        sync2.trigger("owl.goTo", sync2visible[1])
      } else if(num === sync2visible[0]){
        sync2.trigger("owl.goTo", num-1)
      }
      
    }

    //Begin: Validate and Submit contact form via Ajax
    jQuery("#add-new-listing").validate({
      //Ajax validation rules
      validClass:'validated',
      rules: {
        mt_listing_name: {
          required: true,
          minlength: 2
        },
        details: {
          required: true,
          minlength: 2
        },
      },
      //Ajax validation messages
      messages: {
        mt_listing_name: {
          required: "This field is required",
          minlength: "This field must consist of at least 2 characters"
        },
        details: {
          required: "This field is required",
          minlength: "This field must consist of at least 2 characters"
        },
      },
      //Submit via Ajax Form
      // submitHandler: function() {
      //   jQuery('#listings_metaboxs').ajaxSubmit();
      //   jQuery('.success_message').fadeIn('slow');
      // }
    });

    jQuery("#add-new-review").validate({
      //Ajax validation rules
      validClass:'validated',
      rules: {
        review_title: {
          required: true,
          minlength: 2
        },
        review_comment: {
          required: true,
          minlength: 2
        },
      },
      //Ajax validation messages
      messages: {
        mt_listing_name: {
          required: "This field is required",
          minlength: "This field must consist of at least 2 characters"
        },
        details: {
          required: "This field is required",
          minlength: "This field must consist of at least 2 characters"
        },
      },
    });
    //End: Validate and Submit contact form via Ajax

    /*jQuery('#DataTable-icondrops-active').dataTable( {
        "columns":[
          {
              "sortable": false
            },
            {
              "sortable": false
            },
            {
              "sortable": false
            },
            {
              "sortable": true
            },
            {
              "sortable": true
            },
            {
              "sortable": false
            }
      ],
      "aoColumnDefs": [
        { "sType": "numeric" }
      ],
      language: {
          searchPlaceholder: "Search ICO"
      },
    });*/
    jQuery('.single-icondrops .progress .progress-bar').css("width",
      function() {
          return jQuery(this).attr("aria-valuenow") + "%";
      }
    );
  });
} (jQuery) )


