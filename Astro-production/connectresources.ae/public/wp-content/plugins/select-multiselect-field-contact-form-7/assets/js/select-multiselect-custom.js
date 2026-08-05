/* Select and Multi-Select — init after jQuery + Select2 (Astro mirror) */
(function ($) {
  function initSelect2() {
    if (!$ || !$.fn || !$.fn.select2) return;
    $("select.wpcf7-selct-multiselct, select.wpcf7-selct_multiselct").each(function () {
      const $el = $(this);
      const $form = $el.closest("form");
      // Skip selects inside display:none ancestors except we'll still init and fix width later
      if ($el.data("select2")) {
        // Re-assert width when parent becomes visible
        try {
          $el.data("select2").$container.css("width", "100%");
        } catch (e) {
          /* ignore */
        }
        return;
      }
      const placeholder = $el.data("placeholder") || "Select one or more";
      $el.select2({
        width: "100%",
        placeholder: placeholder,
        allowClear: $el.data("allow-clear") === true || $el.data("allow-clear") === "true",
        closeOnSelect: true,
        dropdownParent: $form.length ? $form : $(document.body),
      });
      if (!$el.val() || ($el.val() && $el.val().length === 0)) {
        $el.val(null).trigger("change");
      }
    });
  }

  function boot() {
    initSelect2();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      $(boot);
    });
  } else {
    $(boot);
  }
  $(window).on("load", boot);
  setTimeout(boot, 400);
  setTimeout(boot, 1200);

  $(document).on("wpcf7mailsent wpcf7:mailsent", function () {
    $("select.wpcf7-selct-multiselct, select.wpcf7-selct_multiselct").val(null).trigger("change");
  });
})(window.jQuery);
