(function ($) {
	"use strict";
	$(function () {
		// re init layout after ajax request
		$(document).on("sf:ajaxfinish", ".searchandfilter", function (e, data) {
			if (window.elementorFrontend && window.elementorFrontend.elementsHandler && window.elementorFrontend.elementsHandler.runReadyTrigger) {
				setTimeout(function () {
					var runReadyTrigger = window.elementorFrontend.elementsHandler.runReadyTrigger;
					runReadyTrigger($(data.targetSelector));
					var ajaxTarget = $(data.targetSelector);
					if (ajaxTarget.length > 0) {
						ajaxTarget.find('.elementor-widget').each(function () {
							runReadyTrigger($(this));
						});
					}
				}, 100);
			}
		});
	});

	// Detects the end of an ajax request being made.
	var forms = [];
	$(document).on("sf:ajaxfinish", ".searchandfilter", function (e, form) {
		var $form = $('.searchandfilter[data-sf-form-id=' + form.sfid + ']')
		forms[form.sfid] = $form[0].innerHTML;
	});

	// load search forms in popups
	$(window).on('elementor/frontend/init', function () {
		// Search forms in popups reset to their page load state every time they are shown.
		// So we need to keep track of the latest one, and reload it into the popup when it is shown.
		if (window.elementorFrontend) {
			window.elementorFrontend.elements.$window.on('elementor/popup/show', (e, id, document) => {
				if ($().searchAndFilter) {
					var $sliders = $('.elementor-popup-modal .searchandfilter .meta-slider');
					if ($sliders.length > 0) {
						$sliders.empty();
					}

					// Get the forms ID:
					$('.elementor-popup-modal .searchandfilter').each(function () {
						var $form = $(this);
						$form.off();
						var formId = $form.data('sf-form-id');
						if (forms[formId]) {
							// Replace the form with the latest version:
							$form.html(forms[formId])
						}
						$form.searchAndFilter();

					});
				}
			});
		}
	});

}(jQuery));
