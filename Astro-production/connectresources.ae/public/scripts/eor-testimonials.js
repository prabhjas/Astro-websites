/**
 * EOR Hub testimonials carousel — desktop shows 3, tablet/mobile show 1.
 */
(function () {
  var AUTOPLAY_MS = 5000;
  var DESKTOP_MQ = "(min-width: 1025px)";

  function initSection(section) {
    if (!section || section.dataset.eorTestimonialsInit === "1") return;
    var track = section.querySelector(".eor-testimonial-track");
    var slides = track ? [].slice.call(track.children) : [];
    var pagination = section.querySelector(".eor-testimonial-pagination");
    if (!track || !slides.length || !pagination) return;

    section.dataset.eorTestimonialsInit = "1";

    var dots = [].slice.call(pagination.querySelectorAll(".eor-testimonial-dot"));
    var prevBtn = pagination.querySelector(".eor-testimonial-prev");
    var nextBtn = pagination.querySelector(".eor-testimonial-next");
    var desktopMq = window.matchMedia(DESKTOP_MQ);
    var index = dots.findIndex(function (d) {
      return d.classList.contains("is-active");
    });
    if (index < 0) index = 0;

    var timer = null;
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var carouselMode = !desktopMq.matches;

    function isCarouselMode() {
      return !desktopMq.matches;
    }

    function setCarouselActive(i) {
      index = ((i % slides.length) + slides.length) % slides.length;

      slides.forEach(function (slide, slideIndex) {
        var active = slideIndex === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });

      dots.forEach(function (dot, dotIndex) {
        var active = dotIndex === index;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    function setDesktopActive() {
      slides.forEach(function (slide) {
        slide.classList.add("is-active");
        slide.setAttribute("aria-hidden", "false");
      });

      dots.forEach(function (dot, dotIndex) {
        var active = dotIndex === 0;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    function setActive(i) {
      if (isCarouselMode()) {
        setCarouselActive(i);
      } else {
        setDesktopActive();
      }
    }

    function stopAutoplay() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function startAutoplay() {
      stopAutoplay();
      if (!isCarouselMode() || reducedMotion || slides.length < 2) return;
      timer = setInterval(function () {
        setCarouselActive(index + 1);
      }, AUTOPLAY_MS);
    }

    function applyMode() {
      var nextMode = isCarouselMode();
      if (nextMode === carouselMode) return;
      carouselMode = nextMode;

      if (carouselMode) {
        setCarouselActive(index);
        startAutoplay();
      } else {
        stopAutoplay();
        setDesktopActive();
      }
    }

    function goTo(i) {
      if (!isCarouselMode()) return;
      setCarouselActive(i);
      startAutoplay();
    }

    dots.forEach(function (dot, dotIndex) {
      dot.addEventListener("click", function () {
        goTo(dotIndex);
      });
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goTo(index - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goTo(index + 1);
      });
    }

    section.addEventListener("mouseenter", stopAutoplay);
    section.addEventListener("mouseleave", startAutoplay);
    section.addEventListener("focusin", stopAutoplay);
    section.addEventListener("focusout", function (e) {
      if (!section.contains(e.relatedTarget)) startAutoplay();
    });

    if (typeof desktopMq.addEventListener === "function") {
      desktopMq.addEventListener("change", applyMode);
    } else if (typeof desktopMq.addListener === "function") {
      desktopMq.addListener(applyMode);
    }

    setActive(index);
    startAutoplay();
  }

  function boot() {
    document.querySelectorAll(".elementor-element-e7a1test").forEach(initSection);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("load", function () {
    setTimeout(boot, 100);
  });

  window.initEorTestimonials = boot;
})();
