/**
 * Fallback Elementor Swiper carousels (fleet + testimonials).
 */
(() => {
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

  function boot() {
    const SwiperCtor = window.Swiper;
    if (!SwiperCtor) return;

    document.querySelectorAll(".elementor-main-swiper, .swiper").forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.swiper || el.classList.contains("swiper-initialized")) return;
      if (!el.querySelector(".swiper-slide")) return;

      const settings = parseSettings(el);
      const parent = el.closest(".elementor-element") || el.parentElement;
      const next = parent?.querySelector(
        ".elementor-swiper-button-next, .swiper-button-next",
      );
      const prev = parent?.querySelector(
        ".elementor-swiper-button-prev, .swiper-button-prev",
      );
      const pagination = parent?.querySelector(".swiper-pagination");

      const slidesPerView =
        Number(settings.slides_per_view) ||
        Number(settings.slides_to_show) ||
        1;

      const space =
        typeof settings.space_between === "object"
          ? Number(settings.space_between?.size) || 10
          : Number(settings.space_between) || 10;

      const mobileSlides =
        Number(settings.slides_per_view_mobile) ||
        Math.min(1, slidesPerView);
      const tabletSlides =
        Number(settings.slides_per_view_tablet) ||
        Math.min(2, slidesPerView);

      const isTestimonial = !!el.closest(".elementor-widget-testimonial-carousel");
      const wantsAutoplay =
        settings.autoplay === "yes" ||
        (isTestimonial && settings.autoplay !== "no");

      try {
        // eslint-disable-next-line no-new
        new SwiperCtor(el, {
          slidesPerView: mobileSlides,
          loop: settings.loop !== "no" && settings.infinite !== "no",
          speed: Number(settings.speed) || 500,
          autoplay: wantsAutoplay
            ? {
                delay: Number(settings.autoplay_speed) || 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: settings.pause_on_hover === "yes",
              }
            : false,
          navigation:
            next && prev ? { nextEl: next, prevEl: prev } : undefined,
          pagination: pagination
            ? { el: pagination, clickable: true, type: "bullets" }
            : undefined,
          spaceBetween: space,
          watchOverflow: true,
          centeredSlides: settings.centered_slides === "yes",
          breakpoints: {
            768: { slidesPerView: tabletSlides },
            1025: { slidesPerView },
          },
        });
      } catch (e) {
        console.warn("sp-carousel init failed", e);
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

  function run() {
    ensureSwiper(() => {
      boot();
      setTimeout(boot, 300);
      setTimeout(boot, 1000);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  window.addEventListener("load", () => setTimeout(boot, 200));
})();
