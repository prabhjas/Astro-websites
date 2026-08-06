/**
 * Single-post in-content CF7 form: keep sticky/fixed while the article scrolls.
 * CSS sticky alone fails when ancestors use overflow-x:hidden (common sitewide).
 */
(function () {
  if (!document.body.classList.contains("single-post")) return;

  var mq = window.matchMedia("(min-width: 901px)");
  var TOP = 110;
  var col;
  var form;
  var placeholder;
  var ticking = false;

  function pick() {
    col = document.querySelector(".vc_column_container.type_sticky");
    form = col && col.querySelector(".wpcf7");
    if (!form || !col) return false;
    if (!placeholder) {
      placeholder = document.createElement("div");
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.className = "sp-sticky-form-placeholder";
      placeholder.style.display = "none";
      form.parentNode.insertBefore(placeholder, form);
    }
    return true;
  }

  function clearFixed() {
    if (!form || !placeholder) return;
    placeholder.style.display = "none";
    placeholder.style.height = "";
    form.style.position = "";
    form.style.top = "";
    form.style.left = "";
    form.style.width = "";
    form.style.zIndex = "";
    form.style.margin = "";
    form.classList.remove("is-sp-sticky-fixed");
  }

  function sync() {
    if (!mq.matches) {
      clearFixed();
      return;
    }
    if ((!form || !col || !placeholder) && !pick()) return;

    var colRect = col.getBoundingClientRect();
    var wasFixed = form.classList.contains("is-sp-sticky-fixed");
    var probe = wasFixed ? placeholder : form;
    var probeRect = probe.getBoundingClientRect();
    var formHeight = form.offsetHeight;
    var formWidth = probeRect.width;
    var formLeft = probeRect.left;
    var naturalTop = probeRect.top;

    var shouldFix = naturalTop <= TOP && colRect.bottom > TOP + formHeight + 8;

    if (shouldFix) {
      if (!wasFixed) {
        placeholder.style.display = "block";
        placeholder.style.height = formHeight + "px";
        placeholder.style.width = formWidth + "px";
      }
      var top = TOP;
      var maxTop = colRect.bottom - formHeight - 8;
      if (maxTop < TOP) top = Math.max(8, maxTop);

      form.style.position = "fixed";
      form.style.top = top + "px";
      form.style.left = formLeft + "px";
      form.style.width = formWidth + "px";
      form.style.zIndex = "40";
      form.style.margin = "0";
      form.classList.add("is-sp-sticky-fixed");
    } else {
      clearFixed();
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      sync();
    });
  }

  function boot() {
    if (!pick()) return;
    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);
    if (mq.addEventListener) mq.addEventListener("change", sync);
    else if (mq.addListener) mq.addListener(sync);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
