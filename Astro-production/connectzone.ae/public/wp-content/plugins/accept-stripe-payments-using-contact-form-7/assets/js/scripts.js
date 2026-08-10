
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }
  
  function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }
  (function($) {
      'use strict';

      var getFormId = function($form) {
          return parseInt($('input[name="_wpcf7"]', $form).val(), 10);
      };

      var formHasStripe = function($form) {
          return cf7sa_object.cf7sa_stripe.hasOwnProperty(getFormId($form));
      };

      var setStripeReady = function($form, isReady) {
          $form.attr('data-cf7sa-stripe-ready', isReady ? '1' : '0');
      };

      var isStripeReady = function($form) {
          return $form.attr('data-cf7sa-stripe-ready') === '1';
      };

      var isHiddenByConditionalLogic = function($element) {
          if (!$element.length) {
              return true;
          }

          if ($element.is(':hidden')) {
              return true;
          }

          if ($element.closest('.wpcf7cf-hidden, .wpcf7cf-hide, [aria-hidden="true"]').length) {
              return true;
          }

          return $element.parents().filter(function() {
              var $parent = $(this);
              return $parent.css('display') === 'none' || $parent.css('visibility') === 'hidden' || $parent.attr('aria-hidden') === 'true';
          }).length > 0;
      };

      var isFormReadyToSubmit = function($form) {
          var isValid = true;
          var checkedGroups = {};

          $form.find('select.wpcf7-validates-as-required').each(function() {
              if (isHiddenByConditionalLogic($(this))) {
                  return;
              }

              var value = $(this).val();
              if (value === null || value === '' || ($.isArray(value) && value.length < 1)) {
                  isValid = false;
                  return false;
              }
          });

          if (!isValid) {
              return false;
          }

          $form.find('input.wpcf7-validates-as-required, textarea.wpcf7-validates-as-required').each(function() {
              var $field = $(this);
              if ($field.is(':disabled') || $field.attr('type') === 'hidden' || isHiddenByConditionalLogic($field)) {
                  return;
              }

              if ($field.is(':checkbox') || $field.is(':radio')) {
                  var fieldName = $field.attr('name');
                  if (!fieldName || checkedGroups[fieldName]) {
                      return;
                  }

                  checkedGroups[fieldName] = true;
                  if ($form.find(':input[name="' + fieldName + '"]:checked').length < 1) {
                      isValid = false;
                      return false;
                  }

                  return;
              }

              if ($.trim($field.val()) === '') {
                  isValid = false;
                  return false;
              }
          });

          if (!isValid) {
              return false;
          }

          $form.find('.wpcf7-checkbox.wpcf7-validates-as-required, .wpcf7-radio.wpcf7-validates-as-required').each(function() {
              if (isHiddenByConditionalLogic($(this))) {
                  return;
              }

              if ($(this).find(':input:checked').length < 1) {
                  isValid = false;
                  return false;
              }
          });

          if (!isValid) {
              return false;
          }

          $form.find('.wpcf7-acceptance').each(function() {
              var $acceptance = $(this);
              var $checkbox = $acceptance.find('input:checkbox');

              if ($checkbox.is(':disabled') || $acceptance.hasClass('optional') || isHiddenByConditionalLogic($acceptance)) {
                  return;
              }

              if ($acceptance.hasClass('invert')) {
                  if ($checkbox.is(':checked')) {
                      isValid = false;
                      return false;
                  }
                  return;
              }

              if (!$checkbox.is(':checked')) {
                  isValid = false;
                  return false;
              }
          });

          return isValid;
      };

      var updateSubmitState = function($form) {
          if (!formHasStripe($form)) {
              return;
          }

          var shouldEnable = isStripeReady($form) && isFormReadyToSubmit($form) && !$form.hasClass('payment-submitting');
          $('.wpcf7-submit', $form).prop('disabled', !shouldEnable);
      };

      var scheduleSubmitStateUpdate = function($form) {
          if (!formHasStripe($form)) {
              return;
          }

          updateSubmitState($form);

          if (window.requestAnimationFrame) {
              window.requestAnimationFrame(function() {
                  updateSubmitState($form);
              });
          }

          $.each([0, 50, 150, 300], function(index, delay) {
              setTimeout(function() {
                  updateSubmitState($form);
              }, delay);
          });
      };
      
      $(document).on('input change keyup', 'form.cf7sa :input', function() {
          var $activeForm = $(this).closest('form.cf7sa');
          scheduleSubmitStateUpdate($activeForm);
      });

      $(document).on('wpcf7cf_show_group wpcf7cf_hide_group wpcf7cf_change', function(event) {
          $('form.cf7sa').each(function() {
              scheduleSubmitStateUpdate($(this));
          });
      });
  
      if (typeof wpcf7 === 'undefined' || wpcf7 === null) {
          return
      }
  
      if (typeof wpcf7_cf7sa === 'undefined' || wpcf7_cf7sa === null) {
          var wpcf7_cf7sa = ''
      }
      wpcf7_cf7sa = $.extend({
          cached: 0,
          inputs: []
      }, wpcf7);
      wpcf7_cf7sa.isFormReadyToSubmit = isFormReadyToSubmit;
      wpcf7_cf7sa.updateSubmitState = updateSubmitState;
      $(function() {
          wpcf7_cf7sa.supportHtml5 = (function() {
              var features = {};
              var input = document.createElement('input');
              features.placeholder = 'placeholder' in input;
              var inputTypes = ['email', 'url', 'tel', 'number', 'range', 'date'];
              $.each(inputTypes, function(index, value) {
                  input.setAttribute('type', value);
                  features[value] = input.type !== 'text'
              });
              return features
          })();
          $('div.wpcf7 > form.cf7sa').each(function() {
              var $form = $(this);
              wpcf7_cf7sa.initForm($form);
              if (wpcf7_cf7sa.cached) {
                  wpcf7_cf7sa.refill($form)
              }
          })
      });
      wpcf7_cf7sa.getId = function(form) {
          return getFormId($(form))
      };
      wpcf7_cf7sa.stripeTokenHandler = function(token, form) {
          $('input[name="stripeClientSecret"]', form).val(token)
      }
      wpcf7_cf7sa.initForm = function(form) {
          var enablePostalCode = cf7sa_object.enablePostalCode;
          var $form = $(form);
          var form_id = wpcf7_cf7sa.getId($form);
          if (!cf7sa_object.cf7sa_stripe.hasOwnProperty(form_id)) {
              $form.removeClass('cf7sa');
              return;
          }
          if(enablePostalCode == 1){
            var enablePostalCodecf7 = true;
          }else{
            var enablePostalCodecf7 = false;
          } 
          setStripeReady($form, false);
          updateSubmitState($form);

          if (window.MutationObserver && !$form.data('cf7saConditionalObserver')) {
              var conditionalObserver = new MutationObserver(function(mutations) {
                  var shouldUpdate = false;

                  $.each(mutations, function(index, mutation) {
                      if (mutation.type === 'attributes' && $.inArray(mutation.attributeName, ['class', 'style', 'aria-hidden', 'hidden']) !== -1) {
                          shouldUpdate = true;
                          return false;
                      }
                  });

                  if (shouldUpdate) {
                      scheduleSubmitStateUpdate($form);
                  }
              });

              conditionalObserver.observe($form.get(0), {
                  attributes: true,
                  subtree: true,
                  attributeFilter: ['class', 'style', 'aria-hidden', 'hidden']
              });
              $form.data('cf7saConditionalObserver', conditionalObserver);
          }

          var stripe;
          var elements;
          var cardElement;
          var paymentForm;
          if (cf7sa_object.cf7sa_stripe.hasOwnProperty(form_id)) {
              stripe = Stripe(cf7sa_object.cf7sa_stripe[form_id]);
              elements = stripe.elements();
              cardElement = elements.create('card', {
                  style: JSON.parse(cf7sa_object.cf7sa_stripe_style[form_id]),
                  hidePostalCode: enablePostalCodecf7,
              });
              cardElement.mount('#card-element-' + form_id);
              cardElement.addEventListener('change', function(event) {
                  setStripeReady($form, false);
                  var displayError = document.getElementById('card-errors-' + form_id);
                  if (event.error) {
                      displayError.textContent = event.error.message;					
                  } else {
                      displayError.textContent = '';
                  }
                  
                  if (event.complete) {
                      setStripeReady($form, true);
                  }
                  updateSubmitState($form);
              })
          }
          
          $form.submit(function(event) {
              
              if( !isStripeReady($form) || !isFormReadyToSubmit($form) ) {
                  updateSubmitState($form);
                  return false;
              }
              event.preventDefault();
              event.stopImmediatePropagation();
              
              $('.ajax-loader', $form).addClass('is-active');
              if (!wpcf7_cf7sa.supportHtml5.placeholder) {
                  $('[placeholder].placeheld', $form).each(function(i, n) {
                      $(n).val('').removeClass('placeheld')
                  })
              }
                  var formData = new FormData($form.get(0));
                  // Security: Add nonce for CSRF protection
                  formData.append('_wpcf7_nonce', cf7sa_object.nonce);
                  var $message = $('.wpcf7-response-output', $form);
                  var form_id = wpcf7_cf7sa.getId($form);
                  var intentresponse = "";
                  $.ajax({
                      type: 'POST',
                      url: cf7sa_object.ajax_url,
                      data: formData,
                      processData: !1,
                      contentType: !1,
                      beforeSend: function() {
                          $(".wpcf7-spinner", $form).css("visibility", "visible");
                          $('.ajax-loader', $form).addClass('is-active');
                          $form.addClass('payment-submitting');
                          updateSubmitState($form);
                          if( isFormReadyToSubmit($form) ) {
                              $('.wpcf7-spinner', $form).show();
                              $('.wpcf7-response-output', $form).hide();
                          } else {
                              $('.wpcf7-spinner', $form).hide();
                              $('.wpcf7-response-output', $form).show();
                          }
                      },
                      success: function(response) {
                          if (response!='0') {
                              setStripeReady($form, false);
                              updateSubmitState($form);
                              const IntentsResponse = stripe.confirmCardPayment(response, {
                                  payment_method: {
                                      card: cardElement,
                                  },
                              })
                              IntentsResponse.then(function(result) {
                                if (result.paymentIntent) {
                                    if (typeof(result.paymentIntent) !== 'undefined') {
                                        if (result.paymentIntent.status == "succeeded") {
                                            $('input[name="stripeClientSecret"]', $form).val(result.paymentIntent.id);
                                            wpcf7_cf7sa.submit($form, result, elements, cardElement)
                                        }
                                    } else {
                                        $form.removeClass('payment-submitting');
                                        $message.html('').append('<span>'+ frontend_msg_object.undefined +'</span>').slideDown('fast');
                                        $("#please-wait").hide();
                                        $(".wpcf7-spinner", $form).css("visibility", "hidden");
                                        updateSubmitState($form);
                                    }
                                } else {
                                     $form.removeClass('payment-submitting');
                                     $message.html('').append('<span>Payment is faild</span>').slideDown('fast');
                                     $("#please-wait").hide();
                                     $(".wpcf7-spinner", $form).css("visibility", "hidden");
                                     updateSubmitState($form);
                                }
                            })
                          }else {
                              $form.removeClass('payment-submitting');
                              $message.html('').append('<span>Payment is faild</span>').slideDown('fast');
                              $("#please-wait").hide();
                              $(".wpcf7-spinner", $form).css("visibility", "hidden");
                              updateSubmitState($form);
                          }
                      }
                  });
                  return false;
          });
  
  
          if ($($form).find('.ajax-loader').length < 1) {
              $('.wpcf7-submit', $form).after('<span class="ajax-loader"></span>')
          }
          //wpcf7_cf7sa.toggleSubmit($form);
          // $form.on('click', '.wpcf7-acceptance', function() {
          //     wpcf7_cf7sa.toggleSubmit($form)
          // });
          $('.wpcf7-exclusive-checkbox', $form).on('click', 'input:checkbox', function() {
              var name = $(this).attr('name');
              $form.find('input:checkbox[name="' + name + '"]').not(this).prop('checked', !1)
          });
          $('.wpcf7-list-item.has-free-text', $form).each(function() {
              var $freetext = $(':input.wpcf7-free-text', this);
              var $wrap = $(this).closest('.wpcf7-form-control');
              if ($(':checkbox, :radio', this).is(':checked')) {
                  $freetext.prop('disabled', !1)
              } else {
                  $freetext.prop('disabled', !0)
              }
              $wrap.on('change', ':checkbox, :radio', function() {
                  var $cb = $('.has-free-text', $wrap).find(':checkbox, :radio');
                  if ($cb.is(':checked')) {
                      $freetext.prop('disabled', !1).focus()
                  } else {
                      $freetext.prop('disabled', !0)
                  }
              })
          });
          if (!wpcf7_cf7sa.supportHtml5.placeholder) {
              $('[placeholder]', $form).each(function() {
                  $(this).val($(this).attr('placeholder'));
                  $(this).addClass('placeheld');
                  $(this).focus(function() {
                      if ($(this).hasClass('placeheld')) {
                          $(this).val('').removeClass('placeheld')
                      }
                  });
                  $(this).blur(function() {
                      if ('' === $(this).val()) {
                          $(this).val($(this).attr('placeholder'));
                          $(this).addClass('placeheld')
                      }
                  })
              })
          }
          if (wpcf7_cf7sa.jqueryUi && !wpcf7_cf7sa.supportHtml5.date) {
              $form.find('input.wpcf7-date[type="date"]').each(function() {
                  $(this).datepicker({
                      dateFormat: 'yy-mm-dd',
                      minDate: new Date($(this).attr('min')),
                      maxDate: new Date($(this).attr('max'))
                  })
              })
          }
          if (wpcf7_cf7sa.jqueryUi && !wpcf7_cf7sa.supportHtml5.number) {
              $form.find('input.wpcf7-number[type="number"]').each(function() {
                  $(this).spinner({
                      min: $(this).attr('min'),
                      max: $(this).attr('max'),
                      step: $(this).attr('step')
                  })
              })
          }
          $('.wpcf7-character-count', $form).each(function() {
              var $count = $(this);
              var name = $count.attr('data-target-name');
              var down = $count.hasClass('down');
              var starting = parseInt($count.attr('data-starting-value'), 10);
              var maximum = parseInt($count.attr('data-maximum-value'), 10);
              var minimum = parseInt($count.attr('data-minimum-value'), 10);
              var updateCount = function(target) {
                  var $target = $(target);
                  var length = $target.val().length;
                  var count = down ? starting - length : length;
                  $count.attr('data-current-value', count);
                  $count.text(count);
                  if (maximum && maximum < length) {
                      $count.addClass('too-long')
                  } else {
                      $count.removeClass('too-long')
                  }
                  if (minimum && length < minimum) {
                      $count.addClass('too-short')
                  } else {
                      $count.removeClass('too-short')
                  }
              };
              $(':input[name="' + name + '"]', $form).each(function() {
                  updateCount(this);
                  $(this).keyup(function() {
                      updateCount(this)
                  })
              })
          });
          $form.on('change', '.wpcf7-validates-as-url', function() {
              var val = $.trim($(this).val());
              if (val && !val.match(/^[a-z][a-z0-9.+-]*:/i) && -1 !== val.indexOf('.')) {
                  val = val.replace(/^\/+/, '');
                  val = 'http://' + val
              }
              $(this).val(val)
          })
      };
      wpcf7_cf7sa.submit = function(form, stripe, elements, card) {
          if (typeof window.FormData !== 'function') {
              return
          }
          var $form = $(form);
          $('.ajax-loader', $form).addClass('is-active');
          wpcf7_cf7sa.clearResponse($form);
          var formData = new FormData($form.get(0));
          var detail = {
              id: $form.closest('div.wpcf7').attr('id'),
              status: 'init',
              inputs: [],
              formData: formData
          };
          $.each($form.serializeArray(), function(i, field) {
              if ('_wpcf7' == field.name) {
                  detail.contactFormId = field.value
              } else if ('_wpcf7_version' == field.name) {
                  detail.pluginVersion = field.value
              } else if ('_wpcf7_locale' == field.name) {
                  detail.contactFormLocale = field.value
              } else if ('_wpcf7_unit_tag' == field.name) {
                  detail.unitTag = field.value
              } else if ('_wpcf7_container_post' == field.name) {
                  detail.containerPostId = field.value
              } else if (field.name.match(/^_wpcf7_\w+_free_text_/)) {
                  var owner = field.name.replace(/^_wpcf7_\w+_free_text_/, '');
                  detail.inputs.push({
                      name: owner + '-free-text',
                      value: field.value
                  })
              } else if (field.name.match(/^_/)) {} else {
                  detail.inputs.push(field)
              }
          });
          wpcf7_cf7sa.triggerEvent($form.closest('div.wpcf7'), 'beforesubmit', detail);
          var ajaxSuccess = function(data, status, xhr, $form) {
              detail.id = $(data.into).attr('id');
              detail.status = data.status;
              detail.apiResponse = data;
              var $message = $('.wpcf7-response-output', $form);
              switch (data.status) {
                  case 'validation_failed':
                      $.each(data.invalidFields, function(i, n) {
                          $(n.into, $form).each(function() {
                              wpcf7_cf7sa.notValidTip(this, n.message);
                              $('.wpcf7-form-control', this).addClass('wpcf7-not-valid');
                              $('[aria-invalid]', this).attr('aria-invalid', 'true')
                          })
                      });
                      $message.addClass('wpcf7-validation-errors');
                      $form.addClass('invalid');
                      wpcf7_cf7sa.triggerEvent(data.into, 'invalid', detail);
                      break;
                  case 'acceptance_missing':
                      $message.addClass('wpcf7-acceptance-missing');
                      $form.addClass('unaccepted');
                      wpcf7_cf7sa.triggerEvent(data.into, 'unaccepted', detail);
                      break;
                  case 'spam':
                      $message.addClass('wpcf7-spam-blocked');
                      $form.addClass('spam');
                      wpcf7_cf7sa.triggerEvent(data.into, 'spam', detail);
                      break;
                  case 'aborted':
                      $message.addClass('wpcf7-aborted');
                      $form.addClass('aborted');
                      wpcf7_cf7sa.triggerEvent(data.into, 'aborted', detail);
                      break;
                  case 'mail_sent':
                      $message.addClass('wpcf7-mail-sent-ok');
                      $form.addClass('sent');
                      wpcf7_cf7sa.triggerEvent(data.into, 'mailsent', detail);
                      break;
                  case 'mail_failed':
                      $message.addClass('wpcf7-mail-sent-ng');
                      $form.addClass('failed');
                      wpcf7_cf7sa.triggerEvent(data.into, 'mailfailed', detail);
                      break;
                  default:
                      var customStatusClass = 'custom-' + data.status.replace(/[^0-9a-z]+/i, '-');
                      $message.addClass('wpcf7-' + customStatusClass);
                      $form.addClass(customStatusClass)
              }
              wpcf7_cf7sa.refill($form, data);
              wpcf7_cf7sa.triggerEvent(data.into, 'submit', detail);
              if ( $form.hasClass('sent') ) {
                  $form.find('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea').val('');
                  $form.find('input:checkbox, input:radio').prop('checked', false);
                  $form.find('select').prop('selectedIndex', 0);
                  //wpcf7_cf7sa.toggleSubmit($form)
              }
              if (!wpcf7_cf7sa.supportHtml5.placeholder) {
                  $form.find('[placeholder].placeheld').each(function(i, n) {
                      $(n).val($(n).attr('placeholder'))
                  })
              }
              $message.html('').append(data.message).slideDown('fast');
              $message.attr('role', 'alert');
              $('.screen-reader-response', $form.closest('.wpcf7')).each(function() {
                  var $response = $(this);
                  var $status = $response.find('[role="status"]');
                  if ( $status.length ) {
                      $status.html('').append(data.message);
                  } else {
                      $response.html('').append($('<p></p>').attr({
                          'role': 'status',
                          'aria-live': 'polite',
                          'aria-atomic': 'true'
                      }).append(data.message));
                  }
                  if (data.invalidFields) {
                      var $invalids = $('<ul></ul>');
                      $.each(data.invalidFields, function(i, n) {
                          if (n.idref) {
                              var $li = $('<li></li>').append($('<a></a>').attr('href', '#' + n.idref).append(n.message))
                          } else {
                              var $li = $('<li></li>').append(n.message)
                          }
                          $invalids.append($li)
                      });
                      $response.append($invalids)
                  }
                  $response.attr('role', 'alert').focus()
              })
          };
          $.ajax({
              type: 'POST',
              url: wpcf7_cf7sa.api.getRoute('/contact-forms/' + wpcf7_cf7sa.getId($form) + '/feedback'),
              data: formData,
              dataType: 'json',
              processData: !1,
              contentType: !1
          }).done(function(data, status, xhr) {
              ajaxSuccess(data, status, xhr, $form);
              $('.ajax-loader', $form).removeClass('is-active');
              $("#please-wait").hide();
              $(".wpcf7-spinner", $form).css("visibility", "hidden");
              $form.removeClass('payment-submitting');
              updateSubmitState($form);
          }).fail(function(xhr, status, error) {
              var $e = $('<div class="ajax-error"></div>').text(error.message);
              $form.after($e);
              $form.removeClass('payment-submitting');
              updateSubmitState($form);
          })
      };
      wpcf7_cf7sa.triggerEvent = function(target, name, detail) {
          var $target = $(target);
          var event = new CustomEvent('wpcf7' + name, {
              bubbles: !0,
              detail: detail
          });
          $target.get(0).dispatchEvent(event);
          $target.trigger('wpcf7:' + name, detail);
          $target.trigger(name + '.wpcf7', detail)
      };
      /*wpcf7_cf7sa.toggleSubmit = function(form, state) {
          var $form = $(form);
          var $submit = $('input:submit', $form);
          if (typeof state !== 'undefined') {
              $submit.prop('disabled', !state);
              return
          }
          if ($form.hasClass('wpcf7-acceptance-as-validation')) {
              return
          }
          $submit.prop('disabled', !1);
          $('.wpcf7-acceptance', $form).each(function() {
              var $span = $(this);
              var $input = $('input:checkbox', $span);
              if (!$span.hasClass('optional')) {
                  if ($span.hasClass('invert') && $input.is(':checked') || !$span.hasClass('invert') && !$input.is(':checked')) {
                      $submit.prop('disabled', !0);
                      return !1
                  }
              }
          })
      };*/
      wpcf7_cf7sa.notValidTip = function(target, message) {
          var $target = $(target);
          $('.wpcf7-not-valid-tip', $target).remove();
          $('<span role="alert" class="wpcf7-not-valid-tip"></span>').text(message).appendTo($target);
          if ($target.is('.use-floating-validation-tip *')) {
              var fadeOut = function(target) {
                  $(target).not(':hidden').animate({
                      opacity: 0
                  }, 'fast', function() {
                      $(this).css({
                          'z-index': -100
                      })
                  })
              };
              $target.on('mouseover', '.wpcf7-not-valid-tip', function() {
                  fadeOut(this)
              });
              $target.on('focus', ':input', function() {
                  fadeOut($('.wpcf7-not-valid-tip', $target))
              })
          }
      };
      wpcf7_cf7sa.refill = function(form, data) {
          var $form = $(form);
          var refillCaptcha = function($form, items) {
              $.each(items, function(i, n) {
                  $form.find(':input[name="' + i + '"]').val('');
                  $form.find('img.wpcf7-captcha-' + i).attr('src', n);
                  var match = /([0-9]+)\.(png|gif|jpeg)$/.exec(n);
                  $form.find('input:hidden[name="_wpcf7_captcha_challenge_' + i + '"]').attr('value', match[1])
              })
          };
          var refillQuiz = function($form, items) {
              $.each(items, function(i, n) {
                  $form.find(':input[name="' + i + '"]').val('');
                  $form.find(':input[name="' + i + '"]').siblings('span.wpcf7-quiz-label').text(n[0]);
                  $form.find('input:hidden[name="_wpcf7_quiz_answer_' + i + '"]').attr('value', n[1])
              })
          };
          if (typeof data === 'undefined') {
              $.ajax({
                  type: 'GET',
                  url: wpcf7_cf7sa.api.getRoute('/contact-forms/' + wpcf7_cf7sa.getId($form) + '/refill'),
                  beforeSend: function(xhr) {
                      var nonce = $form.find(':input[name="_wpnonce"]').val();
                      if (nonce) {
                          xhr.setRequestHeader('X-WP-Nonce', nonce)
                      }
                  },
                  dataType: 'json'
              }).done(function(data, status, xhr) {
                  if (data.captcha) {
                      refillCaptcha($form, data.captcha)
                  }
                  if (data.quiz) {
                      refillQuiz($form, data.quiz)
                  }
              })
          } else {
              if (data.captcha) {
                  refillCaptcha($form, data.captcha)
              }
              if (data.quiz) {
                  refillQuiz($form, data.quiz)
              }
          }
      };
      wpcf7_cf7sa.clearResponse = function(form) {
          var $form = $(form);
          $form.removeClass('invalid spam sent failed');
          $form.siblings('.screen-reader-response').html('').attr('role', '');
          $('.wpcf7-not-valid-tip', $form).remove();
          $('[aria-invalid]', $form).attr('aria-invalid', 'false');
          $('.wpcf7-form-control', $form).removeClass('wpcf7-not-valid');
          $('.wpcf7-response-output', $form).hide().empty().removeAttr('role').removeClass('wpcf7-mail-sent-ok wpcf7-mail-sent-ng wpcf7-validation-errors wpcf7-spam-blocked')
      };
      wpcf7_cf7sa.api.getRoute = function(path) {
          var url = wpcf7_cf7sa.api.root + wpcf7_cf7sa.api.namespace + path;
          return url
      }
  })(jQuery);
  (function() {
      if (typeof window.CustomEvent === "function") return !1;
  
      function CustomEvent(event, params) {
          params = params || {
              bubbles: !1,
              cancelable: !1,
              detail: undefined
          };
          var evt = document.createEvent('CustomEvent');
          evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
          return evt
      }
      CustomEvent.prototype = window.Event.prototype;
      window.CustomEvent = CustomEvent
  })()
