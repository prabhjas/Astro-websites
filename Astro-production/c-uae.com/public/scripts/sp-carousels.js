/**
 * Homepage / Elementor loop-carousel Swiper takeover for Astro SSR.
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

  function destroyIfAny(el) {
    try {
      if (el.swiper && !el.swiper.destroyed) el.swiper.destroy(true, true);
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
    );
    el.querySelectorAll(".swiper-slide-duplicate").forEach((n) => n.remove());
  }

  function initOne(el) {
    const SwiperCtor = window.Swiper;
    if (!SwiperCtor || !(el instanceof HTMLElement)) return;
    if (!el.querySelector(".swiper-slide")) return;

    // Already healthy (autoplay running or static OK)
    if (
      el.dataset.spCarouselOk === "1" &&
      el.swiper &&
      !el.swiper.destroyed &&
      (!el.swiper.params.autoplay || el.swiper.autoplay?.running)
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

    destroyIfAny(el);

    const slides = el.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)").length;
    const loopEnabled =
      settings.loop === "yes" ||
      settings.infinite === "yes" ||
      (settings.infinite !== "no" && settings.loop !== "no");
    const loop = loopEnabled && slides > desktop;

    const base = {
      slidesPerView: desktop,
      spaceBetween: space,
      speed: num(settings.speed, 500),
      watchOverflow: true,
      autoplay:
        settings.autoplay === "yes"
          ? {
              delay: num(settings.autoplay_speed, 5000),
              disableOnInteraction: false,
              pauseOnMouseEnter: settings.pause_on_hover === "yes",
            }
          : false,
      navigation:
        next && prev ? { nextEl: next, prevEl: prev } : undefined,
      pagination:
        pagination && settings.pagination && settings.pagination !== "none"
          ? {
              el: pagination,
              clickable: true,
              type: settings.pagination === "fraction" ? "fraction" : "bullets",
            }
          : undefined,
      breakpoints: {
        0: { slidesPerView: mobile, spaceBetween: space },
        768: { slidesPerView: tablet, spaceBetween: space },
        1025: { slidesPerView: desktop, spaceBetween: space },
      },
    };

    const tryInit = (withLoop) => {
      destroyIfAny(el);
      const sw = new SwiperCtor(el, { ...base, loop: withLoop });
      el.dataset.spCarouselOk = "1";
      if (sw.autoplay) {
        try {
          sw.autoplay.start();
        } catch {
          /* ignore */
        }
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
          ".elementor-loop-container.swiper, .swiper.elementor-loop-container, .elementor-main-swiper",
        )
        .forEach((el) => {
          el.dataset.spCarouselOk = "";
          initOne(el);
        });
    } finally {
      booting = false;
    }
  }

  function run() {
    // Wait for Elementor Pro handlers to finish their (often broken) pass
    setTimeout(boot, 1200);
    setTimeout(boot, 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  window.addEventListener("load", () => setTimeout(boot, 800));
})();
