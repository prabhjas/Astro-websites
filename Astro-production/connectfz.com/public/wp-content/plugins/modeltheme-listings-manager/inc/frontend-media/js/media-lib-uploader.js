/*(function($) {

$(document).ready( function() {
  var file_frame; // variable for the wp.media file_frame
  
  // attach a click event (or whatever you want) to some element on your page
  $( '#frontend-button' ).on( 'click', function( event ) {
    event.preventDefault();

        // if the file_frame has already been created, just reuse it
    if ( file_frame ) {
      file_frame.open();
      return;
    } 

    file_frame = wp.media.frames.file_frame = wp.media({
      title: $( this ).data( 'uploader_title' ),
      button: {
        text: $( this ).data( 'uploader_button_text' ),
      },
      multiple: true // set this to true for multiple file selection
    });

    file_frame.on( 'select', function() {
      attachment = file_frame.state().get('selection').first().toJSON();

      // do something with the file here
      $( '#frontend-button' ).hide();
      $( '#frontend-image' ).attr('src', attachment.url);
      console.log(attachment.url);
      $( '#user_pic_custom' ).val(attachment.url);
    });

    file_frame.open();
  });
});

})(jQuery);*/


jQuery(document).ready(function($){
  var custom_uploader;
  $('.upload-images').click(function(e) {
    e.preventDefault();
    //If the uploader object has already been created, reopen the dialog
    if (custom_uploader) {
      custom_uploader.open();
      return;
    }
    //Extend the wp.media object
    custom_uploader = wp.media.frames.file_frame = wp.media({
      title: 'Choose Image',
      button: {
        text: 'Choose Image'
      },
      multiple: true
    });
    custom_uploader.on('select', function() {
      var selection = custom_uploader.state().get('selection');
      selection.map( function( attachment ) {
        attachment = attachment.toJSON();

        //attachment = custom_uploader.state().get('selection').first().toJSON();

        $(".group_pictures_holder").append("<div class='col-md-4' name="+attachment.id+"><img class='imges' name="+attachment.id+" src="+attachment.url+"><div class='delete' name="+attachment.id+">[ Remove ]</div></div>");

        var value;
        var values;
        $( "#group_pictures" ).val( $( ".group_pictures_holder .imges" ).map(function() {
            return $(this).attr('name');
        })
        .get()
        .join( ", " ) );

        $('.group_pictures_holder.row .delete').click(function(e) {

          var selector_parent = $(this).parent().attr('name');
          var selector_child = $(this).attr('name');
          
          var input_ids = $('#group_pictures[type=hidden]').val();

          console.log('--------------');

          var input_final;

          if (input_ids.endsWith(selector_child)) { 
            input_final = input_ids.replace(selector_child,'');
          } else if (input_ids.indexOf(',') > -1) {
             input_final = input_ids.replace(selector_child+', ','');
          } else {
              input_final = input_ids.replace(selector_child,'');
          }

          /*if (input_ids.endsWith(",")) {
            names = names.substring(0, names.length() - 1);
          }*/

          
          $('#group_pictures[type=hidden]').attr('value', input_final);

          if(selector_parent == selector_child) {
              $(this).parent().remove();     
          }         

        });



      });
    });
    custom_uploader.open();
  });
});