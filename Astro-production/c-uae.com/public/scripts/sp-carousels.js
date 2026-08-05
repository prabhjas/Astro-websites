/**
 * Homepage / Elementor loop-carousel Swiper takeover for Astro SSR.
 * Elementor Pro often leaves a half-broken instance (display:grid + dead nav);
 * we hard-reset and re-init with a working Swiper config.
 */
(() => {
  let booting = false;

  function parseSettings(el) {
    let node = el;
    for (let i = 0; i < 6 && node; i++) {
      const raw = node.getAttribute?.("data-settings");
      if (raw && /slides_per_view|slides_to_show|autoplay|loop/i.test(raw)) {
        try {
          return JSON.parse(raw.replace(/&quot;/g, '"'));
        } catch {
          /* keep walking */
        }
      }
      node = node.parentElement;
    }
    const widget = el.closest("[data-settings]") || el.closest(".elementor-widget");
    const fallback =
      widget?.getAttribute("data-settings") ||
      el.getAttribute("data-settings") ||
      "{}";
    try {
      return JSON.parse(fallback.replace(/&quot;/g, '"'));
    } catch {
      return {};
    }
  }

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function hardReset(el) {
    try {
      if (el.swiper && !el.swiper.destroyed) el.swiper.destroy(true, true);
    } catch {
      /* Elementor’s broken instance often throws on destroy */
    }
    try {
      el.swiper = undefined;
    } catch {
      /* ignore */
    }
    try {
      delete el.swiper;
    } catch {
      /* ignore */
    }
    el.classList.remove(
      "swiper-initialized",
      "swiper-horizontal",
      "swiper-pointer-events",
      "swiper-backface-hidden",
      "elementor-grid",
    );
    el.querySelectorAll(".swiper-slide-duplicate").forEach((n) => n.remove());
    // Grid display from .elementor-grid blocks transforms; force Swiper layout
    el.style.display = "block";
    el.style.overflow = "hidden";
  }

  function initOne(el) {
    const SwiperCtor = window.Swiper;
    if (!SwiperCtor || !(el instanceof HTMLElement)) return;
    if (!el.querySelector(".swiper-slide")) return;

    if (
      el.dataset.spCarouselOk === "1" &&
      el.swiper &&
      !el.swiper.destroyed &&
      typeof el.swiper.slideNext === "function"
    ) {
      return;
    }

    const settings = parseSettings(el);
    const parent = el.closest(".elementor-element") || el.parentElement;
    const next = parent?.querySelector(
      ".elementor-swiper-button-next, .swiper-button-next",
    );
    const prev = parent?.querySelector(
      ".elementor-swiper-button-prev, .swiper-button-prev",
    );
    const pagination = parent?.querySelector(
      ".swiper-pagination, .elementor-swiper-pagination",
    );

    const desktop = num(
      settings.slides_to_show || settings.slides_per_view || settings.slidesPerView,
      3,
    );
    const tablet = num(
      settings.slides_to_show_tablet || settings.slides_per_view_tablet,
      Math.min(2, desktop),
    );
    const mobile = num(
      settings.slides_to_show_mobile || settings.slides_per_view_mobile,
      1,
    );
    let space = 30;
    const spaceRaw = settings.image_spacing_custom || settings.space_between;
    if (typeof spaceRaw === "object" && spaceRaw) space = num(spaceRaw.size, 30);
    else if (spaceRaw != null && spaceRaw !== "") space = num(spaceRaw, 30);

    hardReset(el);

    const slides = el.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)").length;
    const loopEnabled =
      settings.loop === "yes" ||
      settings.infinite === "yes" ||
      (settings.infinite !== "no" && settings.loop !== "no");
    const loop = loopEnabled && slides > desktop;

    const autoplayDelay = Math.min(num(settings.autoplay_speed, 2500), 2500);
    const base = {
      slidesPerView: desktop,
      spaceBetween: space,
      speed: num(settings.speed, 500),
      watchOverflow: false,
      observer: true,
      observeParents: true,
      // Always auto-rotate review/loop carousels (faster than Elementor's 5s default)
      autoplay: {
        delay: autoplayDelay,
        disableOnInteraction: false,
        pauseOnMouseEnter: false,
      },
      navigation:
        next && prev ? { nextEl: next, prevEl: prev } : false,
      pagination:
        pagination && settings.pagination && settings.pagination !== "none"
          ? {
              el: pagination,
              clickable: true,
              type: settings.pagination === "fraction" ? "fraction" : "bullets",
            }
          : false,
      breakpoints: {
        0: { slidesPerView: mobile, spaceBetween: space },
        768: { slidesPerView: tablet, spaceBetween: space },
        1025: { slidesPerView: desktop, spaceBetween: space },
      },
    };

    const tryInit = (withLoop) => {
      hardReset(el);
      const sw = new SwiperCtor(el, { ...base, loop: withLoop });
      el.dataset.spCarouselOk = "1";
      try {
        sw.autoplay?.start?.();
      } catch {
        /* ignore */
      }
      // Keep rotating even if Elementor or hover pauses it
      const keepAlive = () => {
        try {
          if (sw.destroyed) return;
          if (!sw.autoplay?.running) sw.autoplay?.start?.();
        } catch {
          /* ignore */
        }
      };
      el.addEventListener("mouseenter", keepAlive);
      el.addEventListener("mouseleave", keepAlive);
      setInterval(keepAlive, autoplayDelay + 500);
      // Fallback click wiring if Elementor nav module is flaky
      if (next && prev) {
        next.onclick = (e) => {
          e.preventDefault();
          sw.slideNext();
          keepAlive();
        };
        prev.onclick = (e) => {
          e.preventDefault();
          sw.slidePrev();
          keepAlive();
        };
      }
      return sw;
    };

    try {
      tryInit(loop);
    } catch (err) {
      console.warn("sp-carousel loop init failed, non-loop", err);
      try {
        tryInit(false);
      } catch (err2) {
        console.warn("sp-carousel init failed", err2);
      }
    }
  }

  function boot() {
    if (!window.Swiper || booting) return;
    booting = true;
    try {
      document
        .querySelectorAll(
          ".elementor-loop-container.swiper, .swiper.elementor-loop-container, .elementor-main-swiper, .testi .swiper",
        )
        .forEach((el) => {
          // Allow health-check re-init; clear sticky OK only on first pass flags
          initOne(el);
        });
    } finally {
      booting = false;
    }
  }

  function run() {
    // Wait for Elementor Pro’s broken pass, then take over
    setTimeout(boot, 800);
    setTimeout(boot, 1800);
    setTimeout(boot, 3200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  window.addEventListener("load", () => setTimeout(boot, 600));
})();
