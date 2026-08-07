jQuery(document).ready(function($){
document.addEventListener( 'wpcf7submit', function( event ) {
    $(".wpcf7-spinner").css("visibility","hidden");
    $(".cf7-tab",  $form).removeClass("cf7-new-tab");
    var data = event.detail;
    var $form = $(data.apiResponse.into).find("form");
    var error_tab = false;
    var tab_current = parseInt( $(".wpcf7_check_tab", $form).val() );
    var step_comfirm_html = '<div class="cf7-container-step-confirm">';
    var cout_tab = $(".cf7-display-steps-container li", $form).length - 2;
    $( ".cf7-display-steps-container li" ,$form).each(function( index ) {
        if( index > cout_tab ){
            return;
        }
        var title = $( this ).text().trim();
        var fist_char = title.charAt(0);
        if( $.isNumeric(fist_char)){
            title = title.substring(1);
        }
        step_comfirm_html +='<div class="cf7-step-confirm-title">'+ title +'</div>';
        var tab_name = $(this).data("tab");
        var name_tab = [];
        $form.find( tab_name + " input," + tab_name + " select," + tab_name +" textarea" ).each(function( index, joc ) {
            if ($(this).attr("name") != "" && typeof $(this).attr("name") != 'undefined') { 
                var name = $(this).attr("name").replace("[]", "");
                if( name_tab.indexOf(name) < 0 ) {
                    name_tab.push(name);
                    var value = cf7_step_confirm[name];
                    if(value  === undefined || value == "" ) {
                        value = name
                    }
                    var type =$(this).attr("type");
                    var data ="";
                    if( type == "radio" ){
                            var chkArray = [];
                            $("input[name="+name+"]:checked").each(function() {
                                chkArray.push($(this).val());
                            });
                            data = chkArray.join(',') ;
                    } else if(type == "checkbox"){
                            var chkArray = [];
                            $('input[name="'+name+'[]"]:checked').each(function() {
                                chkArray.push($(this).val());
                            });
                            data = chkArray.join(',') ;
                    } else{
                        data = $(this).val();
                    }
                    if(data.trim() != "") { 
                        if( name.search("repeater") !== 0 ) {
                            step_comfirm_html +='<div class="cf7-step-confirm-item"><div class="cf7-step-confirm-name">'+ value+': </div><div class="cf7-step-confirm-value">'+ data +'</div></div>';
                        }
                    }
                } 
            }       
        })
    });
    step_comfirm_html +="</div>";
    $(".cf7-data-confirm",$form).html(step_comfirm_html);
if( data.status == "validation_failed" ) {
    $.each( data.apiResponse.invalid_fields, function( i, n ) {
        if( $(".cf7-tab-"+tab_current + ' [name="'+n.field+'"]' ,  $form ).length > 0 ) {
            console.log(tab_current);
            console.log(n.field);
            error_tab = true;
            return;
         }
         if( $(".cf7-tab-"+tab_current + ' [name="'+n.field+'[]"]' ,  $form ).length > 0 ) {
            console.log(tab_current);
            console.log(n.field);
            error_tab = true;
            return;
         }
    } );  
    console.log(error_tab);
    console.log(data.apiResponse.invalid_fields);
     if( !error_tab ) {
        /*
        * Next tab
        */
        var next_tab = tab_current+1;
        $(".cf7-tab", $form).addClass("hidden");
        $(".cf7-tab-"+next_tab,  $form).removeClass("hidden");
        $(".cf7-tab-"+next_tab,  $form).addClass("cf7-new-tab");
        $(".wpcf7-not-valid-tip",  $form).remove();
        $(".cf7-tab-"+next_tab +" .wpcf7-form-control",  $form).removeClass("wpcf7-not-valid");
        $(".wpcf7_check_tab", $form).val( next_tab  ).change();
        $(".wpcf7-response-output", $form).addClass("hidden");
        $(".cf7-display-steps-container li", $form).removeClass("active");
        $(".cf7-display-steps-container .cf7-steps-"+next_tab, $form).addClass("active");
        for(var i=1;i<next_tab;i++){
            $(".cf7-display-steps-container li.cf7-steps-"+i,  $form).addClass("enabled");
        }
        $(".cf7-tab-"+tab_current + " .multistep-nav-right .ajax-loader",  $form).addClass("hidden");
        var top = $('.container-multistep-header', $form).offset().top - 200;
     $('html, body').animate({scrollTop : top},800);
        if( next_tab == $(".multistep_total", $form).val() ){
            $('.wpcf7-acceptance input:checkbox',$form).each(function () {
                   $(this).prop( "checked", false );
            });
            $(".multistep-check input", $form).val("ok").change();
        }
    }else{
         $(".wpcf7-response-output", $form).removeClass("hidden");
    }  
    }else{
        $(".cf7-steps-1", $form).addClass("active");
        $(".cf7-tab", $form).addClass("hidden");
        $(".cf7-tab-1", $form).removeClass("hidden");
        $(".wpcf7_check_tab", $form).val(1);
        $(".wpcf7-response-output", $form).removeClass("hidden");
        var top = $('.container-multistep-header', $form).offset().top - 200;
         $('html, body').animate({scrollTop : top},800);
        $(".wpcf7-response-output", $form).removeClass("hidden");
    } 
}, false );
    $(".wpcf7").on('click','.wpcf7-submit',function(e){
        var check_class = $(this).closest('.wpcf7').find('.wpcf7-acceptance').length;
        $(".wpcf7-spinner").css("visibility","visible");
        if( check_class >0 ){
            if( !$(this).closest('.wpcf7').find('.wpcf7-acceptance input').is(":checked") ) {
               $(this).closest('.wpcf7').find('.wpcf7-acceptance').addClass('wpcf7-not-valid1');
            }
        }
    })
    $(".multistep-cf7-next").click(function(e){
       e.preventDefault();
       var $form = $(this ).closest('form'); 
      $(".wpcf7-spinner").css("visibility","visible");
       var tab_current = parseInt( $(".wpcf7_check_tab",$form).val() ); 
       $('.wpcf7-acceptance input:checkbox',$form).each(function () {
               var check= $(".cf7-tab-"+tab_current).find(".wpcf7-acceptance input:checkbox").val();
               if(check != 1){
                    $(this).prop( "checked", true );
               }
        });
       $(this).closest('form').find(".wpcf7-submit").removeAttr("disabled").click();
    })
    $(".multistep-cf7-prev").click(function(e){
         e.preventDefault();
        var $form = $(this ).closest('form');
        $(".wpcf7-response-output",$form).addClass("hidden");
        var tab_current = parseInt( $(".wpcf7_check_tab",$form).val() );
        var prev_tab = tab_current - 1;
        $(".cf7-tab",$form).addClass("hidden");
        $(".cf7-tab-"+prev_tab, $form).removeClass("hidden");
        $(".wpcf7_check_tab",$form).val( prev_tab  ).change();
        $(".cf7-display-steps-container li",$form).removeClass("active");
        $(".cf7-display-steps-container li", $form).removeClass("enabled");
        $(".cf7-display-steps-container .cf7-steps-"+prev_tab,$form).addClass("active");
        for(var i=1;i<prev_tab;i++){
            $(".cf7-display-steps-container li.cf7-steps-"+i,$form).addClass("enabled");
        }
        $(".multistep-check input",$form).val("");
        var top = $('.container-multistep-header',$form).offset().top-200;
        $('html, body').animate({scrollTop : top},800);
        $('.wpcf7-acceptance input:checkbox').each(function () {
               $(this).prop( "checked", false );
        });
        $(".multistep-check input", $form).val('').change();
        return false;
    })
    $(".multistep-cf7-first").click(function(event) {
        var $form = $(this ).closest('form');
        $(".wpcf7-response-output",$form).addClass("hidden");
        var prev_tab =  1;
        $(".cf7-tab",$form).addClass("hidden");
        $(".cf7-tab-"+prev_tab,$form).removeClass("hidden");
        $(".wpcf7_check_tab",$form).val( prev_tab  ).change();
        $(".cf7-display-steps-container li",$form).removeClass("active");
        $(".cf7-display-steps-container li",$form).removeClass("enabled");
        $(".cf7-display-steps-container .cf7-steps-"+prev_tab, $form).addClass("active");
        for(var i=1;i<prev_tab;i++){
            $(".cf7-display-steps-container li.cf7-steps-"+i, $form).addClass("enabled");
        }
        $(".multistep-check input",$form).val("");
        var top = $('.container-multistep-header',$form).offset().top - 200;
        $('html, body').animate({scrollTop : top},800);
        $('.wpcf7-acceptance input:checkbox').each(function () {
               $(this).prop( "checked", false );
        });
        $(".multistep-check input", $form).val('').change();
        return false;
    });
    function remove_duplicates_ctf7_step(arr) {
        var obj = {};
        var ret_arr = [];
        for (var i = 0; i < arr.length; i++) {
            obj[arr[i]] = true;
        }
        for (var key in obj) {
            if("_wpcf7" == key || "_wpcf7_version" == key  || "_wpcf7_locale" == key  || "_wpcf7_unit_tag" == key || "_wpnonce" == key || "undefined" == key  || "_wpcf7_container_post" == key || "_wpcf7_nonce" == key  ){
            }else {
                ret_arr.push(key +"(?!\\d)");
            }
        }
        return ret_arr;
    }
})