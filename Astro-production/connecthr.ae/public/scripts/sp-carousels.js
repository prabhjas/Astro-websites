/**
 * Fallback Elementor image carousels only (logo strips).
 * Do NOT touch .elementor-main-swiper — Elementor Pro owns testimonial/slides carousels.
 */
(() => {
  const MOBILE_MAX = 767;
  const MOBILE_STACK_WIDGET_IDS = new Set(["238453b"]);

  function parseSettings(el) {
    const widget = el.closest("[data-settings], .elementor-widget");
    const raw =
      widget?.getAttribute("data-settings") ||
      el.getAttribute("data-settings") ||
      "{}";
    try {
      return JSON.parse(raw.replace(/&quot;/g, '"'));
    } catch {
      return {};
    }
  }

  function num(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function spaceBetween(settings, suffix = "") {
    const key = suffix ? `space_between${suffix}` : "space_between";
    const v = settings[key];
    if (typeof v === "object") return Number(v?.size) || 10;
    return Number(v) || 10;
  }

  function buildBreakpoints(settings) {
    const desktop = num(settings.slides_per_view || settings.slides_to_show, 1);
    const tablet = num(settings.slides_per_view_tablet, desktop);
    const mobile = num(settings.slides_per_view_mobile, 1);

    return {
      0: { slidesPerView: mobile, spaceBetween: spaceBetween(settings, "_mobile") },
      768: { slidesPerView: tablet, spaceBetween: spaceBetween(settings, "_tablet") },
      1025: { slidesPerView: desktop, spaceBetween: spaceBetween(settings) },
    };
  }

  function getCarouselWidget(el) {
    return el.closest(".elementor-widget-image-carousel, .elementor-widget[data-widget_type*='carousel']");
  }

  function shouldMobileStack(widgetEl) {
    return (
      widgetEl instanceof HTMLElement &&
      MOBILE_STACK_WIDGET_IDS.has(widgetEl.getAttribute("data-id") || "")
    );
  }

  function markMobileStack(widgetEl, swiperEl) {
    widgetEl?.classList.add("sp-mobile-stack");
    swiperEl.classList.add("sp-mobile-stack");
  }

  function swiperWorks(el) {
    return (
      el.swiper &&
      !el.swiper.destroyed &&
      typeof el.swiper.slideNext === "function"
    );
  }

  function isReady(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el.dataset.spCarouselBooted === "1") return false;
    if (swiperWorks(el)) return false;
    if (el.classList.contains("swiper-initialized") && swiperWorks(el)) return false;
    return Boolean(el.querySelector(".swiper-wrapper"));
  }

  function applyMobileStacks() {
    if (!window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches) return;
    document.querySelectorAll(".elementor-image-carousel-wrapper").forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const widgetEl = getCarouselWidget(el);
      if (shouldMobileStack(widgetEl)) markMobileStack(widgetEl, el);
    });
  }

  function boot() {
    const SwiperCtor = window.Swiper;
    if (!SwiperCtor) return;

    applyMobileStacks();

    document.querySelectorAll(".elementor-image-carousel-wrapper").forEach((el) => {
      if (!isReady(el)) return;

      const slides = el.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)");
      if (slides.length < 1) return;

      const settings = parseSettings(el);
      const widgetEl = getCarouselWidget(el);

      if (shouldMobileStack(widgetEl) && el.classList.contains("sp-mobile-stack")) {
        el.dataset.spCarouselBooted = "1";
        return;
      }

      const desktop = num(settings.slides_per_view || settings.slides_to_show, 1);
      const wantAutoplay = settings.autoplay === "yes";

      const config = {
        slidesPerView: num(settings.slides_per_view_mobile, 1),
        spaceBetween: spaceBetween(settings, "_mobile"),
        breakpoints: buildBreakpoints(settings),
        loop: settings.infinite !== "no" && settings.loop !== "no" && slides.length > desktop,
        speed: Number(settings.speed) || 500,
        watchOverflow: true,
        observer: true,
        observeParents: true,
        a11y: false,
        navigation: false,
        pagination: false,
        scrollbar: false,
        autoplay: wantAutoplay
          ? {
              delay: Number(settings.autoplay_speed) || 5000,
              disableOnInteraction: false,
              pauseOnMouseEnter: settings.pause_on_hover === "yes",
            }
          : false,
      };

      el.dataset.spCarouselBooted = "1";

      try {
        // eslint-disable-next-line no-new
        new SwiperCtor(el, config);
      } catch {
        delete el.dataset.spCarouselBooted;
      }
    });
  }

  function ensureSwiper(cb) {
    if (window.Swiper) {
      cb();
      return;
    }
    const existing = document.querySelector('script[src*="swiper"]');
    if (existing) {
      existing.addEventListener("load", cb);
      setTimeout(cb, 800);
      return;
    }
    const s = document.createElement("script");
    s.src = "/scripts/swiper.min.js";
    s.onload = cb;
    document.head.appendChild(s);
  }

  function scheduleBoot() {
    ensureSwiper(() => {
      boot();
      setTimeout(boot, 400);
    });
  }

  function run() {
    applyMobileStacks();
    window.addEventListener("elementor/frontend/init", () => setTimeout(scheduleBoot, 900));
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => setTimeout(scheduleBoot, 1500));
    } else {
      setTimeout(scheduleBoot, 1500);
    }
    window.addEventListener("load", () => setTimeout(scheduleBoot, 600));
  }

  run();
  window.addEventListener("resize", applyMobileStacks);
})();
