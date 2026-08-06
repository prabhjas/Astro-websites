/**
 * Connect Zone — Jet Slider (Slider Pro) + Elementor testimonial Swiper fixes.
 */
(() => {
  function parseSettings(el) {
    const raw = el.getAttribute("data-settings") || "{}";
    try {
      return JSON.parse(raw.replace(/&quot;/g, '"'));
    } catch {
      return {};
    }
  }

  function initJetSliders() {
    const $ = window.jQuery;
    if (!$?.fn?.sliderPro) return;

    document.querySelectorAll(".jet-slider").forEach((root) => {
      if (!(root instanceof HTMLElement)) return;
      if (root.dataset.czSliderInit) return;
      const pro = root.querySelector(".slider-pro");
      if (!pro) return;

      const settings = parseSettings(root);
      const height =
        settings.sliderHeight?.size != null
          ? `${settings.sliderHeight.size}${settings.sliderHeight.unit || "px"}`
          : settings.slider_height?.size != null
            ? `${settings.slider_height.size}${settings.slider_height.unit || "px"}`
            : "560px";

      try {
        $(pro).sliderPro({
          width: "100%",
          height,
          arrows: !!settings.sliderNavigation,
          buttons: settings.sliderPagination !== false,
          autoplay: settings.sliderAutoplay !== false,
          autoplayDelay: Number(settings.sliderAutoplayDelay) || 5000,
          autoplayOnHover: settings.sliderAutoplayOnHover || "pause",
          loop: settings.sliderLoop !== false,
          fade: !!settings.sliderFadeMode,
          imageScaleMode: "exact",
          waitForLayers: false,
          touchSwipe: true,
          init() {
            $(pro).addClass("slider-loaded");
            root.dataset.czSliderInit = "1";
            setTimeout(() => {
              try {
                $(pro).sliderPro("resize");
              } catch {
                /* ignore */
              }
            }, 200);
          },
        });
        root.dataset.czSliderInit = "1";
      } catch (e) {
        console.warn("cz jet-slider init failed", e);
      }
    });
  }

  function initTestimonialSwipers() {
    const SwiperCtor = window.Swiper;
    if (!SwiperCtor) return;

    document
      .querySelectorAll(".elementor-widget-testimonial-carousel .elementor-main-swiper")
      .forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const widget = el.closest(".elementor-widget-testimonial-carousel");
        if (!widget || widget.dataset.czTestiInit) return;
        if (!el.querySelector(".swiper-slide")) return;

        const settings = parseSettings(widget);
        const parent = widget;
        const pagination = parent.querySelector(".swiper-pagination");
        const next = parent.querySelector(
          ".elementor-swiper-button-next, .swiper-button-next",
        );
        const prev = parent.querySelector(
          ".elementor-swiper-button-prev, .swiper-button-prev",
        );

        // Rebuild pagination if Elementor left it empty
        if (pagination && !pagination.children.length) {
          pagination.innerHTML = "";
        }

        try {
          if (el.swiper) {
            try {
              el.swiper.destroy(true, true);
            } catch {
              /* ignore */
            }
          }

          const slidesPerView =
            Number(settings.slides_per_view) ||
            Number(settings.slides_to_show) ||
            1;
          const space =
            typeof settings.space_between === "object"
              ? Number(settings.space_between?.size) || 10
              : Number(settings.space_between) || 10;

          // Testimonials on live autoplay even when autoplay key is omitted
          const wantsAutoplay =
            settings.autoplay === "yes" ||
            settings.autoplay === true ||
            settings.autoplay === undefined ||
            settings.autoplay === "";

          // eslint-disable-next-line no-new
          const instance = new SwiperCtor(el, {
            slidesPerView,
            loop: settings.loop !== "no",
            speed: Number(settings.speed) || 500,
            spaceBetween: space,
            watchOverflow: true,
            autoplay: wantsAutoplay
              ? {
                  delay: Number(settings.autoplay_speed) || 5000,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: settings.pause_on_hover !== "no",
                }
              : false,
            pagination:
              pagination && (settings.pagination === "bullets" || !settings.pagination)
                ? {
                    el: pagination,
                    clickable: true,
                    type: "bullets",
                  }
                : undefined,
            navigation: next && prev ? { nextEl: next, prevEl: prev } : undefined,
            breakpoints: {
              768: {
                slidesPerView: Number(settings.slides_per_view_tablet) || slidesPerView,
              },
              1025: {
                slidesPerView: Number(settings.slides_per_view) || slidesPerView,
              },
            },
          });
          if (wantsAutoplay && instance?.autoplay) {
            try {
              instance.autoplay.start();
            } catch {
              /* ignore */
            }
          }
          widget.dataset.czTestiInit = "1";
        } catch (e) {
          console.warn("cz testimonial swiper failed", e);
        }
      });
  }

  function bindMobileHamburger() {
    // Mobile header: Raven menu toggle (visible section on phone)
    document.querySelectorAll(".cz-site-header .raven-nav-menu-toggle").forEach((toggle) => {
      if (toggle.dataset.czBurgerBound) return;
      toggle.dataset.czBurgerBound = "1";
      const section = toggle.closest(".elementor-element-705f233e") || toggle.closest(".cz-site-header");
      const menuRoot =
        section?.querySelector(".raven-nav-menu-main, .raven-nav-menu, nav") ||
        toggle.parentElement?.querySelector(".raven-nav-menu-main, .raven-nav-menu");

      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = !document.documentElement.classList.contains("cz-mobile-menu-open");
        document.documentElement.classList.toggle("cz-mobile-menu-open", open);
        toggle.classList.toggle("raven-nav-menu-toggle--active", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        if (menuRoot) {
          menuRoot.classList.toggle("raven-nav-menu--mobile-active", open);
          menuRoot.style.display = open ? "block" : "";
          menuRoot.style.maxHeight = open ? "min(80vh, 640px)" : "";
          menuRoot.style.overflow = open ? "auto" : "";
        }
      });
    });

    document.querySelectorAll(".cz-site-header .jet-mega-menu").forEach((menu) => {
      const toggle = menu.querySelector(".jet-mega-menu-toggle");
      if (!toggle || toggle.dataset.czBurgerBound) return;
      toggle.dataset.czBurgerBound = "1";

      const open = () => {
        menu.classList.add(
          "jet-mega-menu--mobile-open",
          "jet-mega-menu--open",
          "jet-mega-menu--dropdown-open",
        );
        toggle.setAttribute("aria-expanded", "true");
        document.documentElement.classList.add("cz-mobile-menu-open");
      };
      const close = () => {
        menu.classList.remove(
          "jet-mega-menu--mobile-open",
          "jet-mega-menu--open",
          "jet-mega-menu--dropdown-open",
        );
        toggle.setAttribute("aria-expanded", "false");
        document.documentElement.classList.remove("cz-mobile-menu-open");
      };

      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (menu.classList.contains("jet-mega-menu--mobile-open")) close();
        else open();
      });
    });
  }

  function ensureTestimonialAutoplay() {
    document.querySelectorAll(".elementor-widget-testimonial-carousel").forEach((widget) => {
      const el = widget.querySelector(".swiper, .elementor-main-swiper");
      if (!el) return;
      const sw = el.swiper;
      if (!sw) return;

      // Prefer native Swiper autoplay when available
      try {
        sw.params.autoplay = {
          enabled: true,
          delay: 5000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        };
        if (typeof sw.autoplay?.start === "function") {
          sw.autoplay.start();
        }
      } catch {
        /* fall through to timer */
      }

      if (widget.dataset.czAutoTimer) return;
      widget.dataset.czAutoTimer = "1";
      let paused = false;
      widget.addEventListener("mouseenter", () => {
        paused = true;
      });
      widget.addEventListener("mouseleave", () => {
        paused = false;
      });
      window.setInterval(() => {
        if (paused) return;
        const inst = el.swiper;
        if (!inst) return;
        try {
          if (inst.autoplay?.running) return;
          inst.slideNext();
        } catch {
          /* ignore */
        }
      }, 5000);
    });
  }

  function run() {
    initJetSliders();
    initTestimonialSwipers();
    ensureTestimonialAutoplay();
    bindMobileHamburger();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  window.addEventListener("load", () => {
    run();
    setTimeout(run, 400);
    setTimeout(run, 1200);
    setTimeout(ensureTestimonialAutoplay, 1800);
  });
})();
