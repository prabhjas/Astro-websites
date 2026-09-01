/**
 * Fallback Elementor Swiper carousels (fleet + testimonials).
 */
(() => {
  const MOBILE_MAX = 767;
  /** Widgets that show all slides stacked on mobile instead of a carousel. */
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
      0: {
        slidesPerView: mobile,
        spaceBetween: spaceBetween(settings, "_mobile"),
      },
      768: {
        slidesPerView: tablet,
        spaceBetween: spaceBetween(settings, "_tablet"),
      },
      1025: {
        slidesPerView: desktop,
        spaceBetween: spaceBetween(settings),
      },
    };
  }

  function getCarouselWidget(el) {
    return (
      el.closest(".elementor-element[data-widget_type*='carousel']") ||
      el.closest(".elementor-widget[data-widget_type*='carousel']") ||
      el.closest(".elementor-element[data-widget_type*='slides']") ||
      el.closest(".elementor-widget[data-widget_type*='slides']")
    );
  }

  function markMobileStack(widgetEl, swiperEl) {
    widgetEl?.classList.add("sp-mobile-stack");
    swiperEl.classList.add("sp-mobile-stack");
  }

  function shouldMobileStack(widgetEl) {
    return (
      widgetEl instanceof HTMLElement &&
      MOBILE_STACK_WIDGET_IDS.has(widgetEl.getAttribute("data-id") || "")
    );
  }

  function isReady(el) {
    return (
      el instanceof HTMLElement &&
      !el.dataset.spCarouselBooted &&
      !el.swiper &&
      !el.classList.contains("swiper-initialized") &&
      el.querySelector(".swiper-wrapper")
    );
  }

  /** Apply stacked layout on mobile before Swiper loads. */
  function applyMobileStacks() {
    if (!window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches) return;

    document
      .querySelectorAll(".elementor-main-swiper, .elementor-image-carousel-wrapper")
      .forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const widgetEl = getCarouselWidget(el);
        if (shouldMobileStack(widgetEl)) markMobileStack(widgetEl, el);
      });
  }

  function boot() {
    const SwiperCtor = window.Swiper;
    if (!SwiperCtor) return;

    applyMobileStacks();

    document
      .querySelectorAll(".elementor-main-swiper, .elementor-image-carousel-wrapper")
      .forEach((el) => {
        if (!isReady(el)) return;

        const slides = el.querySelectorAll(
          ".swiper-slide:not(.swiper-slide-duplicate)",
        );
        if (slides.length < 1) return;

        const settings = parseSettings(el);
        const parent = el.closest(".elementor-element") || el.parentElement;
        const widgetEl = getCarouselWidget(el);

        if (shouldMobileStack(widgetEl) && el.classList.contains("sp-mobile-stack")) {
          el.dataset.spCarouselBooted = "1";
          return;
        }

        const next = parent?.querySelector(
          ":scope > .elementor-swiper-button-next, :scope .swiper-button-next, .elementor-swiper-button-next, .swiper-button-next",
        );
        const prev = parent?.querySelector(
          ":scope > .elementor-swiper-button-prev, :scope .swiper-button-prev, .elementor-swiper-button-prev, .swiper-button-prev",
        );
        const pagination = parent?.querySelector(":scope .swiper-pagination, .swiper-pagination");
        const breakpoints = buildBreakpoints(settings);

        const config = {
          slidesPerView: 1,
          breakpoints,
          loop: false,
          speed: Number(settings.speed) || 500,
          watchOverflow: true,
          centeredSlides: settings.centered_slides === "yes",
          observer: true,
          observeParents: true,
        };

        if (
          next instanceof HTMLElement &&
          prev instanceof HTMLElement &&
          document.contains(next) &&
          document.contains(prev)
        ) {
          config.navigation = { nextEl: next, prevEl: prev };
        }
        if (pagination instanceof HTMLElement && document.contains(pagination)) {
          config.pagination = { el: pagination, clickable: true };
        }

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
    // Let Elementor image-carousel bundle init first; fallback only fills gaps.
    window.addEventListener("elementor/frontend/init", () => setTimeout(scheduleBoot, 700));
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => setTimeout(scheduleBoot, 1200));
    } else {
      setTimeout(scheduleBoot, 1200);
    }
    window.addEventListener("load", () => setTimeout(scheduleBoot, 400));
  }

  run();
  window.addEventListener("resize", applyMobileStacks);
})();
