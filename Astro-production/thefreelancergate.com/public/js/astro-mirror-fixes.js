/**
 * Lightweight mirror fixes for Twenty Twenty + Visual Composer + CF7.
 */
(function () {
  function safe(fn) {
    try {
      fn();
    } catch (e) {
      console.warn("[astro-mirror-fixes]", e);
    }
  }

  // Form chrome: hide countrySelect box + red validation (all mirrored pages)
  safe(function () {
    if (document.querySelector('link[data-eg-form-fixes="1"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/form-mirror-fixes.css";
    link.setAttribute("data-eg-form-fixes", "1");
    document.head.appendChild(link);
  });

  safe(function () {
    if (typeof window.jQuery !== "undefined" && typeof window.$ === "undefined") {
      window.$ = window.jQuery;
    }
    window.addEventListener("load", function () {
      if (typeof window.jQuery !== "undefined" && typeof window.$ === "undefined") {
        window.$ = window.jQuery;
      }
    });
  });

  // Contact form endpoint hint for cf7-bridge
  safe(function () {
    if (!document.querySelector('meta[name="sp-contact-endpoint"]')) {
      var m = document.createElement("meta");
      m.setAttribute("name", "sp-contact-endpoint");
      m.setAttribute("content", "/api/contact/");
      document.head.appendChild(m);
    }
    window.__SP_CONTACT_ENDPOINT__ = window.__SP_CONTACT_ENDPOINT__ || "/api/contact/";
  });

  // Twenty Twenty mobile menu — own cover-modal toggles (must set show-modal + active).
  // A previous fallback only toggled .active in capture phase, which double-fired with
  // theme JS and left .cover-modal at display:none.
  safe(function () {
    function toggleCoverModal(btn, target, sel) {
      var isOpen = target.classList.contains("active");
      var toggles = document.querySelectorAll('[data-toggle-target="' + sel + '"]');
      var i;

      if (isOpen) {
        target.classList.remove("active");
        document.body.classList.remove("showing-menu-modal", "showing-modal");
        document.body.classList.add("hiding-modal");
        for (i = 0; i < toggles.length; i++) {
          toggles[i].classList.remove("active");
          toggles[i].setAttribute("aria-expanded", "false");
        }
        setTimeout(function () {
          target.classList.remove("show-modal");
          document.body.classList.remove("hiding-modal");
        }, 500);
        return;
      }

      target.classList.add("show-modal");
      // Allow CSS transition after display flips
      void target.offsetWidth;
      target.classList.add("active");
      document.body.classList.add("showing-menu-modal", "showing-modal");
      document.body.classList.remove("hiding-modal");
      for (i = 0; i < toggles.length; i++) {
        toggles[i].classList.add("active");
        toggles[i].setAttribute("aria-expanded", "true");
      }

      var focusSel = btn.getAttribute("data-set-focus");
      if (focusSel) {
        var focusEl = document.querySelector(focusSel);
        if (focusEl && typeof focusEl.focus === "function") {
          try {
            focusEl.focus();
          } catch (err) {
            /* ignore */
          }
        }
      }
    }

    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target && e.target.closest && e.target.closest("[data-toggle-target]");
        if (!btn) return;

        var sel = btn.getAttribute("data-toggle-target");
        if (!sel) return;

        // Let Twenty Twenty handle slide sub-menus
        if (btn.getAttribute("data-toggle-type") === "slidetoggle") return;

        var target = document.querySelector(sel);
        if (!target) return;

        if (target.classList.contains("cover-modal") || target.classList.contains("menu-modal")) {
          e.preventDefault();
          e.stopImmediatePropagation();
          toggleCoverModal(btn, target, sel);
          return;
        }

        // Generic fallback for other toggles
        var expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", expanded ? "false" : "true");
        target.classList.toggle("active");
        if (btn.getAttribute("data-toggle-body-class")) {
          document.body.classList.toggle(btn.getAttribute("data-toggle-body-class"));
        }
      },
      true,
    );
  });
})();
