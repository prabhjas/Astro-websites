/**
 * Astro Phase-1 mirror fixes for Elementor HTML dumps.
 * - Stops null DOM crashes that flood the console and break widgets
 * - Fallback counter animation when Elementor numerator does not run
 * - Fallback background video when Elementor does not inject <video>
 * - CF7 phone: flag sprites + IP-based country / dial-code selection
 * - Nudges Elementor frontend init when available
 */
(function () {
  function safe(fn) {
    try {
      fn();
    } catch (e) {
      console.warn('[astro-mirror-fixes]', e);
    }
  }

  // WP dumps often call $ while jQuery is in noConflict mode
  safe(function () {
    if (typeof window.jQuery !== 'undefined' && typeof window.$ === 'undefined') {
      window.$ = window.jQuery;
    }
    // Re-alias after deferred jQuery finishes loading
    window.addEventListener('load', function () {
      if (typeof window.jQuery !== 'undefined' && typeof window.$ === 'undefined') {
        window.$ = window.jQuery;
      }
    });
  });

  // Patch getElementById usage from inline WP scripts that assume #arrow exists
  safe(function () {
    var orig = Document.prototype.getElementById;
    Document.prototype.getElementById = function (id) {
      var el = orig.call(this, id);
      if (!el && id === 'arrow') {
        return {
          style: {
            display: '',
            setProperty: function () {},
          },
        };
      }
      return el;
    };
  });

  function animateCounters() {
    var nodes = document.querySelectorAll('.elementor-counter-number[data-to-value]');
    if (!nodes.length) return;

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function run(el) {
      if (el.dataset.astroCounted) return;
      el.dataset.astroCounted = '1';
      var to = parseFloat(el.getAttribute('data-to-value') || '0');
      var from = parseFloat(el.getAttribute('data-from-value') || '0');
      var duration = parseInt(el.getAttribute('data-duration') || '2000', 10);
      if (reduced || !isFinite(to)) {
        el.textContent = String(to);
        return;
      }
      var start = performance.now();
      function frame(now) {
        var t = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        var val = from + (to - from) * eased;
        el.textContent = Number.isInteger(to) ? String(Math.round(val)) : val.toFixed(1);
        if (t < 1) requestAnimationFrame(frame);
        else el.textContent = Number.isInteger(to) ? String(to) : String(to);
      }
      requestAnimationFrame(frame);
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              run(entry.target);
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.35 },
      );
      nodes.forEach(function (n) {
        io.observe(n);
      });
    } else {
      nodes.forEach(run);
    }
  }

  function ensureBackgroundVideos() {
    document.querySelectorAll('.elementor-section[data-settings*="background_video"], .elementor-section[data-settings*="builtforpeople"], section.vid-sec2').forEach(function (section) {
      var settingsRaw = section.getAttribute('data-settings') || '';
      var decoded = settingsRaw
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/\\\//g, '/');

      var linkMatch = decoded.match(/"background_video_link"\s*:\s*"([^"]+)"/);
      if (!linkMatch) return;

      var src = linkMatch[1];
      if (src.indexOf('http') === 0) {
        try {
          src = new URL(src).pathname;
        } catch (e) {}
      }
      if (src.charAt(0) !== '/') src = '/' + src;

      var container =
        section.querySelector('.elementor-background-video-container') ||
        (function () {
          var c = document.createElement('div');
          c.className = 'elementor-background-video-container';
          section.insertBefore(c, section.firstChild);
          return c;
        })();

      var video = container.querySelector('video');
      if (!video) {
        video = document.createElement('video');
        video.className = 'elementor-background-video-hosted elementor-html5-video';
        container.appendChild(video);
      }

      // Elementor sometimes injects an empty <video> — always ensure src
      if (!video.getAttribute('src') && !video.querySelector('source')) {
        video.setAttribute('src', src);
        video.src = src;
      }
      video.setAttribute('autoplay', '');
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('loop', '');
      video.muted = true;
      video.playsInline = true;

      // Match live Elementor: StretchElement only sets pixel width/height.
      // Do NOT set top/left:0 — that shifts the .vid-sec2 corner glow.
      function clearVideoOffsets() {
        video.style.removeProperty('top');
        video.style.removeProperty('left');
        video.style.removeProperty('right');
        video.style.removeProperty('bottom');
        video.style.removeProperty('object-fit');
        video.style.removeProperty('transform');
        video.style.removeProperty('max-width');
      }

      function stretchVideo() {
        clearVideoOffsets();
        var rect = section.getBoundingClientRect();
        var w = Math.max(1, Math.round(rect.width));
        var h = Math.max(1, Math.round(rect.height));
        // Prefer 16:9 cover sizing like Elementor StretchElement
        var vw = w;
        var vh = Math.round((w * 9) / 16);
        if (vh < h) {
          vh = h;
          vw = Math.round((h * 16) / 9);
        }
        video.style.width = vw + 'px';
        video.style.height = vh + 'px';
        clearVideoOffsets();
      }

      stretchVideo();
      // Elementor StretchElement may re-apply top/left:0 after init — strip them
      setTimeout(clearVideoOffsets, 0);
      setTimeout(clearVideoOffsets, 500);
      setTimeout(clearVideoOffsets, 1500);
      if (!section.dataset.astroVideoResize) {
        section.dataset.astroVideoResize = '1';
        window.addEventListener('resize', stretchVideo);
      }

      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    });
  }

  function nudgeElementor() {
    if (!window.elementorFrontend || !window.elementorFrontend.init) return;
    try {
      // Re-run handlers for widgets that may have missed first paint
      if (window.elementorFrontend.elements && window.elementorFrontend.elements.$document) {
        window.elementorFrontend.elements.$document.trigger('elementor/frontend/init');
      }
    } catch (e) {}
  }

  /**
   * Elementor Pro nav-menu handler inits SmartMenus with submenu_icon SVG.
   * If we init SmartMenus first (subIndicators:false), Elementor cannot attach
   * its caret — and a later manual inject doubles with Elementor's. Strategy:
   * wait for Elementor; only fallback-init with the correct SVG once.
   */
  function getNavSubmenuIconHtml(widget) {
    var settings = parseWidgetSettings(widget);
    var icon = settings.submenu_icon && settings.submenu_icon.value;
    if (typeof icon === 'string' && icon.indexOf('<') !== -1) return icon;
    return '<svg aria-hidden="true" class="e-font-icon-svg e-fas-caret-down" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg"><path d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z"></path></svg>';
  }

  function dedupeSubmenuIcons() {
    document.querySelectorAll('.elementor-widget-nav-menu .menu-item-has-children > a').forEach(function (anchor) {
      var arrows = anchor.querySelectorAll(':scope > .sub-arrow');
      arrows.forEach(function (el, idx) {
        if (idx > 0) el.remove();
      });
    });
  }

  function initSmartMenusFallback() {
    var $ = window.jQuery;
    if (!$ || !$.fn || !$.fn.smartmenus) return;

    document
      .querySelectorAll(
        '.elementor-nav-menu--main > .elementor-nav-menu, .elementor-nav-menu--dropdown > .elementor-nav-menu',
      )
      .forEach(function (ul) {
        var $ul = $(ul);
        if ($ul.data('smartmenus')) return;
        var widget = ul.closest('.elementor-widget-nav-menu');
        var iconHtml = widget ? getNavSubmenuIconHtml(widget) : '';
        try {
          if ($.SmartMenus && $.SmartMenus.prototype) {
            $.SmartMenus.prototype.isCSSOn = function () {
              return true;
            };
          }
          $ul.smartmenus({
            subIndicators: !!iconHtml,
            subIndicatorsText: iconHtml || '',
            subIndicatorsPos: 'append',
            subMenusMaxWidth: '1000px',
            subMenusMinWidth: '10em',
          });
        } catch (e) {
          console.warn('[astro-mirror-fixes] smartmenus fallback', e);
        }
      });
    dedupeSubmenuIcons();
  }

  function ensureNavMenus() {
    var $ = window.jQuery;

    // Hover/focus open for desktop dropdowns (works with or without SmartMenus)
    document
      .querySelectorAll(
        '.elementor-nav-menu--main .menu-item-has-children, .elementor-nav-menu--dropdown .menu-item-has-children',
      )
      .forEach(function (li) {
        if (li.dataset.astroNavBound) return;
        li.dataset.astroNavBound = '1';
        var link = li.querySelector(':scope > a.elementor-item, :scope > a');
        if (!link) return;
        link.addEventListener('focus', function () {
          li.classList.add('highlighted');
        });
        li.addEventListener('mouseenter', function () {
          li.classList.add('highlighted');
        });
        li.addEventListener('mouseleave', function () {
          li.classList.remove('highlighted');
        });
      });

    dedupeSubmenuIcons();

    // Give Elementor nav-menu chunk time to init SmartMenus with the real SVG caret.
    // Only fallback if it never attached (missing chunk / race).
    if (!$ || !$.fn) {
      setTimeout(ensureNavMenus, 300);
      return;
    }
    setTimeout(function () {
      initSmartMenusFallback();
      dedupeSubmenuIcons();
    }, 700);
    setTimeout(dedupeSubmenuIcons, 1500);
    setTimeout(dedupeSubmenuIcons, 3000);
  }

  /** Ensure FA + Swiper stylesheets exist (live often inlines SVG; cards still use .fas). */
  function ensureIconAndSwiperCss() {
    // WP Rocket min cache rewrites icon CSS to /wp-content/cache/min/...; relative
    // webfont paths 404 on the Astro mirror and icons show as empty boxes.
    document.querySelectorAll('link[href*="/wp-content/cache/min/"]').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (!href) return;
      if (
        href.indexOf('font-awesome/css/') === -1 &&
        href.indexOf('eicons/css/') === -1 &&
        href.indexOf('elementor-icons') === -1
      ) {
        return;
      }
      var fixed = href.replace(/\/wp-content\/cache\/min\/\d+\//, '/');
      if (fixed && fixed !== href) {
        link.setAttribute('href', fixed);
      }
    });

    function ensureCss(id, href) {
      if (document.getElementById(id)) return;
      if (document.querySelector('link[href="' + href + '"]')) return;
      var link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }

    ensureCss(
      'astro-fa-core-css',
      '/wp-content/plugins/elementor/assets/lib/font-awesome/css/fontawesome.min.css',
    );
    ensureCss(
      'astro-fa-solid-css',
      '/wp-content/plugins/elementor/assets/lib/font-awesome/css/solid.min.css',
    );
    ensureCss(
      'astro-fa-regular-css',
      '/wp-content/plugins/elementor/assets/lib/font-awesome/css/regular.min.css',
    );
    ensureCss(
      'astro-fa-brands-css',
      '/wp-content/plugins/elementor/assets/lib/font-awesome/css/brands.min.css',
    );
    if (!document.querySelector('link[href*="eicons"],link[href*="elementor-icons"]') && !document.getElementById('astro-eicons-css')) {
      var ei = document.createElement('link');
      ei.id = 'astro-eicons-css';
      ei.rel = 'stylesheet';
      ei.href = '/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css';
      document.head.appendChild(ei);
    }
    if (!document.querySelector('link[href*="swiper"]') && !document.getElementById('astro-swiper-css')) {
      var sw = document.createElement('link');
      sw.id = 'astro-swiper-css';
      sw.rel = 'stylesheet';
      sw.href = '/css/swiper.min.css?v=20260804';
      document.head.appendChild(sw);
    }
  }

  /**
   * WP Rocket leaves type="rocketlazyloadscript" — browsers ignore those tags.
   * Mutating `type`/`src` in place does NOT execute them; we must replace the node.
   */
  function unwrapRocketLazyScripts() {
    document
      .querySelectorAll(
        'script[type="rocketlazyloadscript"],script[type="text/rocketlazyloadscript"],script[data-rocket-src]',
      )
      .forEach(function (script) {
        if (!script || !script.parentNode) return;
        if (script.dataset.astroRocketUnwrapped === '1') return;
        script.dataset.astroRocketUnwrapped = '1';

        var src = script.getAttribute('data-rocket-src') || script.getAttribute('src') || '';
        var replacement = document.createElement('script');
        Array.prototype.forEach.call(script.attributes || [], function (attr) {
          if (!attr || !attr.name) return;
          if (attr.name === 'type' || attr.name === 'data-rocket-src' || attr.name === 'data-rocket-defer') return;
          try {
            replacement.setAttribute(attr.name, attr.value);
          } catch (e) {
            /* ignore invalid attrs */
          }
        });
        if (src) {
          replacement.src = src;
          if (script.hasAttribute('defer') || script.getAttribute('data-rocket-defer') != null) {
            replacement.defer = true;
          }
          if (script.hasAttribute('async')) replacement.async = true;
        } else if (script.textContent && script.textContent.trim()) {
          replacement.textContent = script.textContent;
        } else {
          return;
        }
        script.parentNode.replaceChild(replacement, script);
      });
  }

  /** Ensure Swiper global exists even if Elementor chunk is still racing. */
  function ensureSwiperGlobal(cb) {
    if (typeof window.Swiper !== 'undefined') {
      if (typeof cb === 'function') cb();
      return;
    }
    if (window.__astroSwiperLoading) {
      if (typeof cb === 'function') {
        var tries = 0;
        var t = setInterval(function () {
          tries += 1;
          if (typeof window.Swiper !== 'undefined' || tries > 40) {
            clearInterval(t);
            if (typeof window.Swiper !== 'undefined' && typeof cb === 'function') cb();
          }
        }, 100);
      }
      return;
    }
    window.__astroSwiperLoading = true;
    var s = document.createElement('script');
    s.src = '/wp-content/plugins/elementor/assets/lib/swiper/v8/swiper.min.js?ver=8.4.5';
    s.onload = function () {
      window.__astroSwiperLoading = false;
      if (typeof cb === 'function') cb();
    };
    s.onerror = function () {
      window.__astroSwiperLoading = false;
    };
    document.head.appendChild(s);
  }

  /** Scrollsequence (Global Footprint canvas scrub) */
  function ensureScrollsequence() {
    document.querySelectorAll('.scrollsequence-wrap').forEach(function (wrap) {
      wrap.style.border = 'none';
    });

    if (typeof window.ssqInput === 'undefined') {
      var config = document.querySelector('script.scrollsequence-input-script');
      if (config && config.type === 'text/rocketlazyloadscript' && config.textContent) {
        try {
          // eslint-disable-next-line no-eval
          eval(config.textContent);
        } catch (e) {
          console.warn('[astro-mirror-fixes] scrollsequence config', e);
        }
      }
    }

    if (typeof window.scrollsequenceMainFunction === 'function') {
      var canvas = document.querySelector('.scrollsequence-canvas');
      if (canvas && !canvas.dataset.astroSsqNudged) {
        canvas.dataset.astroSsqNudged = '1';
        try {
          window.scrollsequenceMainFunction();
        } catch (e) {
          console.warn('[astro-mirror-fixes] scrollsequence init', e);
        }
      }
    }
  }

  function ensureLottieIcons() {
    if (typeof lottie === 'undefined') return;

    document.querySelectorAll('.elementor-widget-lottie').forEach(function (widget) {
      var host = widget.querySelector('.e-lottie__animation');
      if (!host || host.dataset.astroLottie) return;
      if (host.querySelector('svg')) {
        host.dataset.astroLottie = '1';
        return;
      }

      var settingsRaw = widget.getAttribute('data-settings') || '';
      var decoded = settingsRaw
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/\\\//g, '/');
      var match = decoded.match(/"url"\s*:\s*"([^"]+\.json)"/);
      if (!match) return;

      var path = match[1];
      if (path.indexOf('http') === 0) {
        try {
          path = new URL(path).pathname;
        } catch (e) {}
      }

      host.dataset.astroLottie = '1';
      try {
        lottie.loadAnimation({
          container: host,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: path,
        });
      } catch (e) {
        console.warn('[astro-mirror-fixes] lottie', e);
      }
    });
  }

  function parseWidgetSettings(el) {
    var raw = (el && el.getAttribute('data-settings')) || '';
    if (!raw) return {};
    try {
      return JSON.parse(
        raw
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, '&'),
      );
    } catch (e) {
      return {};
    }
  }

  /** Mark carousel layout before Swiper loads; add testi-slide for embedded service-card templates */
  function prepareTestimonialCarousels() {
    document.querySelectorAll('.elementor-widget-testimonial-carousel').forEach(function (widget) {
      if (widget.dataset.astroTestimonialPrepared) return;
      var wrap = widget.querySelector('.elementor-main-swiper.swiper, .swiper');
      if (!wrap) return;

      var settings = parseWidgetSettings(widget);
      var desktop = parseInt(settings.slides_per_view || '3', 10) || 3;
      var tablet = parseInt(settings.slides_per_view_tablet || '2', 10) || 2;
      wrap.dataset.astroSpvDesktop = String(desktop);
      wrap.dataset.astroSpvTablet = String(tablet);

      if (widget.querySelector('.elementor-testimonial__text [data-elementor-type="section"]')) {
        widget.classList.add('testi-slide');
      }

      var slideCount = wrap.querySelectorAll('.swiper-slide').length;
      if (slideCount <= desktop) {
        widget.classList.add('astro-tcarousel-all-visible-desktop');
      }

      widget.dataset.astroTestimonialPrepared = '1';
    });
  }

  function ensureTestimonialSwiper() {
    prepareTestimonialCarousels();
    if (typeof Swiper === 'undefined') {
      scheduleCarouselRetry();
      return;
    }

    document.querySelectorAll('.elementor-widget-testimonial-carousel').forEach(function (widget) {
      var wrap = widget.querySelector('.elementor-main-swiper.swiper, .swiper');
      if (!wrap) return;

      // Healthy Elementor / prior init
      if (wrap.classList.contains('swiper-initialized') && wrap.swiper) {
        widget.dataset.astroTestimonial = '1';
        return;
      }

      if (widget.dataset.astroTestimonial === '1' && wrap.swiper && wrap.classList.contains('swiper-initialized')) {
        return;
      }

      if (wrap.swiper && typeof wrap.swiper.destroy === 'function') {
        try {
          wrap.swiper.destroy(true, true);
        } catch (e) {
          /* ignore */
        }
      }
      try {
        delete wrap.swiper;
      } catch (e2) {
        /* ignore */
      }

      var settings = parseWidgetSettings(widget);
      var desktop = parseInt(settings.slides_per_view || '3', 10) || 3;
      var tablet = parseInt(settings.slides_per_view_tablet || '2', 10) || 2;
      var mobile = parseInt(settings.slides_per_view_mobile || '1', 10) || 1;
      var gapDesktop =
        settings.space_between && settings.space_between.size !== undefined
          ? parseInt(settings.space_between.size, 10)
          : 0;
      var gapTablet =
        settings.space_between_tablet && settings.space_between_tablet.size !== undefined
          ? parseInt(settings.space_between_tablet.size, 10)
          : 20;
      var gapMobile =
        settings.space_between_mobile && settings.space_between_mobile.size !== undefined
          ? parseInt(settings.space_between_mobile.size, 10)
          : 20;
      var slideCount = wrap.querySelectorAll('.swiper-slide').length;
      // Never loop when all slides fit on desktop (Swiper loop needs extras).
      var loop = settings.loop === 'yes' && slideCount > desktop;
      var paginationEl = widget.querySelector('.swiper-pagination');
      var nextEl = widget.querySelector('.elementor-swiper-button-next, .swiper-button-next');
      var prevEl = widget.querySelector('.elementor-swiper-button-prev, .swiper-button-prev');
      var swiperOptions = {
        slidesPerView: mobile,
        spaceBetween: gapMobile,
        loop: loop,
        speed: parseInt(settings.speed || '500', 10) || 500,
        watchOverflow: true,
        observer: true,
        observeParents: true,
        allowTouchMove: true,
        breakpoints: {
          768: { slidesPerView: tablet, spaceBetween: gapTablet },
          1025: { slidesPerView: desktop, spaceBetween: gapDesktop },
        },
      };

      if (paginationEl) {
        swiperOptions.pagination = { el: paginationEl, clickable: true };
      }
      if (nextEl || prevEl) {
        swiperOptions.navigation = {
          nextEl: nextEl || undefined,
          prevEl: prevEl || undefined,
        };
      }

      if (settings.autoplay === 'yes') {
        swiperOptions.autoplay = {
          delay: parseInt(settings.autoplay_speed || '5000', 10) || 5000,
          disableOnInteraction: false,
        };
      }

      try {
        // eslint-disable-next-line no-new
        new Swiper(wrap, swiperOptions);
        widget.dataset.astroTestimonial = '1';
      } catch (e) {
        console.warn('[astro-mirror-fixes] testimonial swiper', e);
      }
    });
  }

  /** Nested Elementor Pro carousels (reviews, stats strip, yellow comparison cards) */
  function ensureNestedCarousels() {
    if (typeof Swiper === 'undefined') {
      scheduleCarouselRetry();
      return;
    }

    document.querySelectorAll('.elementor-widget-n-carousel').forEach(function (widget) {
      var wrap = widget.querySelector('.e-n-carousel.swiper, .swiper');
      if (!wrap) return;

      // Prefer Elementor's own init when healthy
      if (wrap.classList.contains('swiper-initialized') && wrap.swiper) {
        widget.dataset.astroCarousel = '1';
        return;
      }

      // Half-broken leftover instance (class without swiper, or vice versa)
      if (wrap.swiper && typeof wrap.swiper.destroy === 'function') {
        try {
          wrap.swiper.destroy(true, true);
        } catch (e) {
          /* ignore */
        }
      }

      var settings = parseWidgetSettings(widget);
      var desktop = parseInt(settings.slides_to_show || '3', 10) || 3;
      var tablet = parseInt(settings.slides_to_show_tablet || String(Math.min(2, desktop)), 10) || 2;
      var mobile = parseInt(settings.slides_to_show_mobile || '1', 10) || 1;
      var gap = 12;
      if (settings.image_spacing_custom && settings.image_spacing_custom.size) {
        gap = parseInt(settings.image_spacing_custom.size, 10) || 12;
      }
      var slideCount = wrap.querySelectorAll('.swiper-slide').length;
      var loop = settings.infinite === 'yes' && slideCount > mobile;
      var paginationEl = widget.querySelector('.swiper-pagination');
      var nextEl = widget.querySelector('.elementor-swiper-button-next, .swiper-button-next');
      var prevEl = widget.querySelector('.elementor-swiper-button-prev, .swiper-button-prev');
      var swiperOptions = {
        slidesPerView: mobile,
        spaceBetween: gap,
        loop: loop,
        watchOverflow: true,
        observer: true,
        observeParents: true,
        allowTouchMove: true,
        simulateTouch: true,
        pagination: paginationEl
          ? { el: paginationEl, clickable: true }
          : undefined,
        navigation:
          nextEl || prevEl
            ? { nextEl: nextEl || undefined, prevEl: prevEl || undefined }
            : undefined,
        breakpoints: {
          768: { slidesPerView: tablet, spaceBetween: gap },
          1025: { slidesPerView: desktop, spaceBetween: gap },
        },
      };

      if (settings.autoplay === 'yes') {
        swiperOptions.autoplay = {
          delay: parseInt(settings.autoplay_speed || '5000', 10) || 5000,
          disableOnInteraction: settings.pause_on_interaction !== 'yes',
          pauseOnMouseEnter: settings.pause_on_hover === 'yes',
        };
      }

      try {
        // eslint-disable-next-line no-new
        new Swiper(wrap, swiperOptions);
        widget.dataset.astroCarousel = '1';
      } catch (e) {
        console.warn('[astro-mirror-fixes] nested carousel', e);
      }
    });
  }

  var carouselRetryScheduled = false;
  function scheduleCarouselRetry() {
    if (carouselRetryScheduled) return;
    carouselRetryScheduled = true;
    var attempts = 0;
    function tick() {
      attempts += 1;
      if (typeof Swiper !== 'undefined') {
        carouselRetryScheduled = false;
        safe(forceUninitCarousels);
        return;
      }
      if (attempts < 40) {
        setTimeout(tick, 250);
      } else {
        carouselRetryScheduled = false;
      }
    }
    setTimeout(tick, 250);
  }

  /** Elementor image carousel (client logo marquee on subsidiary pages) */
  function ensureImageCarousels() {
    if (typeof Swiper === 'undefined') {
      ensureSwiperGlobal(function () {
        ensureImageCarousels();
        ensureLoopCarousel();
      });
      scheduleCarouselRetry();
      return;
    }

    document.querySelectorAll('.elementor-widget-image-carousel').forEach(function (widget) {
      var wrap = widget.querySelector('.elementor-image-carousel-wrapper.swiper');
      if (!wrap) return;

      // Prefer Elementor's own init when healthy
      if (wrap.classList.contains('swiper-initialized') && wrap.swiper) {
        widget.dataset.astroImageCarousel = '1';
        return;
      }

      if (wrap.swiper && typeof wrap.swiper.destroy === 'function') {
        try {
          wrap.swiper.destroy(true, true);
        } catch (e) {
          /* ignore */
        }
      }

      var settings = parseWidgetSettings(widget);
      var desktop = parseInt(settings.slides_to_show || '3', 10) || 3;
      var tablet = parseInt(settings.slides_to_show_tablet || String(Math.min(2, desktop)), 10) || 2;
      var mobile = parseInt(settings.slides_to_show_mobile || '1', 10) || 1;
      var gapDesktop =
        settings.image_spacing_custom && settings.image_spacing_custom.size !== undefined
          ? parseInt(settings.image_spacing_custom.size, 10) || 20
          : 20;
      var gapTablet =
        settings.image_spacing_custom_tablet &&
        settings.image_spacing_custom_tablet.size !== undefined &&
        settings.image_spacing_custom_tablet.size !== ''
          ? parseInt(settings.image_spacing_custom_tablet.size, 10)
          : gapDesktop;
      var gapMobile =
        settings.image_spacing_custom_mobile && settings.image_spacing_custom_mobile.size !== undefined
          ? parseInt(settings.image_spacing_custom_mobile.size, 10) || gapDesktop
          : gapDesktop;
      // Homepage partner-logo strip: keep logos tighter than inherited Elementor spacing.
      if (widget.getAttribute('data-id') === '180c51f') {
        desktop = 5;
        tablet = 4;
        mobile = 2;
        gapDesktop = Math.min(gapDesktop, 8);
        gapTablet = Math.min(gapTablet, 8);
        gapMobile = Math.min(gapMobile, 8);
      }
      var slideCount = wrap.querySelectorAll('.swiper-slide').length;
      var autoplayEnabled = settings.autoplay === 'yes';
      var isHomepageLogoStrip = widget.getAttribute('data-id') === '180c51f';
      // Keep at least one hidden slide when autoplay is enabled so the strip can move.
      var desktopView =
        autoplayEnabled && slideCount > 1 && !isHomepageLogoStrip
          ? Math.min(desktop, slideCount - 1)
          : Math.min(desktop, slideCount || 1);
      var tabletView =
        autoplayEnabled && slideCount > 1 && !isHomepageLogoStrip
          ? Math.min(tablet, slideCount - 1)
          : Math.min(tablet, slideCount || 1);
      var mobileView =
        autoplayEnabled && slideCount > 1 && !isHomepageLogoStrip
          ? Math.min(mobile, slideCount - 1)
          : Math.min(mobile, slideCount || 1);
      desktopView = Math.max(1, desktopView);
      tabletView = Math.max(1, tabletView);
      mobileView = Math.max(1, mobileView);
      if (isHomepageLogoStrip && slideCount > 0 && slideCount <= desktopView) {
        // Swiper needs more slides than visible items for a smooth loop.
        var wrapper = wrap.querySelector('.swiper-wrapper');
        if (wrapper) {
          var originals = Array.prototype.slice.call(wrapper.children);
          var guard = 0;
          while (wrapper.children.length <= desktopView && guard < 3) {
            originals.forEach(function (node) {
              wrapper.appendChild(node.cloneNode(true));
            });
            guard += 1;
          }
          slideCount = wrap.querySelectorAll('.swiper-slide').length;
        }
      }
      var loop = settings.infinite === 'yes' && slideCount > desktopView;
      var slidesToScroll = parseInt(settings.slides_to_scroll || '1', 10) || 1;
      var nextEl = widget.querySelector('.elementor-swiper-button-next, .swiper-button-next');
      var prevEl = widget.querySelector('.elementor-swiper-button-prev, .swiper-button-prev');
      var swiperOptions = {
        slidesPerView: mobileView,
        slidesPerGroup: slidesToScroll,
        spaceBetween: gapMobile,
        loop: loop,
        speed: parseInt(settings.speed || '500', 10) || 500,
        watchOverflow: true,
        observer: true,
        observeParents: true,
        allowTouchMove: true,
        breakpoints: {
          768: { slidesPerView: tabletView, spaceBetween: gapTablet, slidesPerGroup: slidesToScroll },
          1025: { slidesPerView: desktopView, spaceBetween: gapDesktop, slidesPerGroup: slidesToScroll },
        },
      };

      if (settings.navigation && settings.navigation !== 'none' && (nextEl || prevEl)) {
        swiperOptions.navigation = {
          nextEl: nextEl || undefined,
          prevEl: prevEl || undefined,
        };
      }

      if (autoplayEnabled) {
        swiperOptions.autoplay = {
          delay: parseInt(settings.autoplay_speed || '3000', 10) || 3000,
          disableOnInteraction: settings.pause_on_interaction === 'yes',
          pauseOnMouseEnter: settings.pause_on_hover === 'yes',
        };
      }

      try {
        // eslint-disable-next-line no-new
        new Swiper(wrap, swiperOptions);
        widget.dataset.astroImageCarousel = '1';
      } catch (e) {
        console.warn('[astro-mirror-fixes] image carousel', e);
      }
    });
  }

  /**
   * Elementor Pro taxonomy-filter → loop-grid.
   * Live WP often mis-wires selected_element (stale id) and filters via AJAX.
   * On the static Astro mirror we filter rendered .e-loop-item nodes by category-* class.
   */
  function ensureTaxonomyFilter() {
    document.querySelectorAll('.elementor-widget-taxonomy-filter').forEach(function (widget) {
      if (widget.dataset.astroTaxonomyFilter === '1') return;

      var search = widget.querySelector('.e-filter');
      if (!search) return;

      var settings = parseWidgetSettings(widget);
      var selectedId = String(settings.selected_element || '').trim();
      var taxonomy = String(settings.taxonomy || 'category').trim() || 'category';

      function findLoopWidget() {
        var candidate = null;
        if (selectedId) {
          candidate = document.querySelector(
            '.elementor-element-' +
              selectedId +
              '.elementor-widget-loop-grid, .elementor-element-' +
              selectedId +
              '.elementor-widget-loop-carousel, [data-id="' +
              selectedId +
              '"].elementor-widget-loop-grid, [data-id="' +
              selectedId +
              '"].elementor-widget-loop-carousel',
          );
          if (candidate && candidate.querySelector('.e-loop-item')) return candidate;
        }

        var parent = widget.parentElement;
        if (parent) {
          candidate = parent.querySelector(
            '.elementor-widget-loop-grid, .elementor-widget-loop-carousel',
          );
          if (candidate && candidate.querySelector('.e-loop-item')) return candidate;
        }

        var section = widget.closest('.elementor-section, .e-con, .elementor-element');
        if (section) {
          candidate = section.querySelector(
            '.elementor-widget-loop-grid, .elementor-widget-loop-carousel',
          );
          if (candidate && candidate.querySelector('.e-loop-item')) return candidate;
        }

        // Last resort: next loop-grid on the page after this filter
        var grids = document.querySelectorAll(
          '.elementor-widget-loop-grid, .elementor-widget-loop-carousel',
        );
        for (var i = 0; i < grids.length; i++) {
          if (
            widget.compareDocumentPosition(grids[i]) & Node.DOCUMENT_POSITION_FOLLOWING &&
            grids[i].querySelector('.e-loop-item')
          ) {
            return grids[i];
          }
        }
        return null;
      }

      var loopWidget = findLoopWidget();
      if (!loopWidget) return;

      var container =
        loopWidget.querySelector('.elementor-loop-container, .swiper-wrapper') || loopWidget;
      var filterParamId = selectedId || loopWidget.getAttribute('data-id') || 'filter';
      var paramKey = 'e-filter-' + filterParamId + '-' + taxonomy;

      function items() {
        return container.querySelectorAll('.e-loop-item');
      }

      function readUrlFilter() {
        try {
          var params = new URL(location.href).searchParams;
          var direct = params.get(paramKey);
          if (direct) return direct;
          // Accept any e-filter-*-category= from shared/bookmarked URLs (stale ids)
          var keys = params.keys();
          var next = keys.next();
          while (!next.done) {
            var k = next.value;
            if (new RegExp('^e-filter-.+-' + taxonomy + '$').test(k)) {
              var v = params.get(k);
              if (v) return v;
            }
            next = keys.next();
          }
        } catch (e) {
          /* ignore */
        }
        return '__all';
      }

      function writeUrlFilter(slug) {
        try {
          var url = new URL(location.href);
          var keys = [];
          url.searchParams.forEach(function (_v, k) {
            if (new RegExp('^e-filter-.+-' + taxonomy + '$').test(k)) keys.push(k);
          });
          keys.forEach(function (k) {
            url.searchParams.delete(k);
          });
          if (slug && slug !== '__all') {
            url.searchParams.set(paramKey, slug);
          }
          history.replaceState({}, '', url.pathname + url.search + url.hash);
        } catch (e) {
          /* ignore */
        }
      }

      function applyFilter(slug, updateUrl) {
        var isAll = !slug || slug === '__all';
        var visible = 0;
        items().forEach(function (item) {
          var match =
            isAll ||
            item.classList.contains(taxonomy + '-' + slug) ||
            item.classList.contains('category-' + slug);
          item.style.display = match ? '' : 'none';
          item.setAttribute('aria-hidden', match ? 'false' : 'true');
          if (match) visible += 1;
        });

        search.querySelectorAll('.e-filter-item').forEach(function (btn) {
          var f = btn.getAttribute('data-filter') || '';
          var pressed = isAll ? f === '__all' : f === slug;
          btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        });

        // Empty state (only for non-all filters)
        var emptyId = 'astro-tax-filter-empty-' + (widget.getAttribute('data-id') || 'x');
        var emptyEl = document.getElementById(emptyId);
        if (!isAll && visible === 0) {
          if (!emptyEl) {
            emptyEl = document.createElement('p');
            emptyEl.id = emptyId;
            emptyEl.className = 'astro-tax-filter-empty';
            emptyEl.style.cssText =
              'grid-column:1/-1;padding:24px 0;margin:0;color:#5A6A76;font-family:Inter,sans-serif;font-size:16px;';
            emptyEl.textContent = 'No posts found in this category.';
            container.appendChild(emptyEl);
          }
          emptyEl.hidden = false;
        } else if (emptyEl) {
          emptyEl.hidden = true;
        }

        if (updateUrl !== false) writeUrlFilter(isAll ? '__all' : slug);
      }

      search.addEventListener(
        'click',
        function (event) {
          var btn = event.target && event.target.closest
            ? event.target.closest('.e-filter-item')
            : null;
          if (!btn || !search.contains(btn)) return;
          event.preventDefault();
          event.stopPropagation();
          applyFilter(btn.getAttribute('data-filter') || '__all', true);
        },
        true,
      );

      applyFilter(readUrlFilter(), false);
      widget.dataset.astroTaxonomyFilter = '1';
    });
  }

  /** Elementor Pro loop-carousel (Insights / blog cards) */
  function ensureLoopCarousel() {
    if (typeof Swiper === 'undefined') {
      ensureSwiperGlobal(function () {
        ensureLoopCarousel();
        ensureImageCarousels();
      });
      scheduleCarouselRetry();
      return;
    }

    document.querySelectorAll('.elementor-widget-loop-carousel').forEach(function (widget) {
      var wrap = widget.querySelector('.swiper.elementor-loop-container, .elementor-loop-container.swiper');
      if (!wrap) return;

      if (wrap.classList.contains('swiper-initialized') && wrap.swiper) {
        widget.dataset.astroLoopCarousel = '1';
        return;
      }

      if (wrap.swiper && typeof wrap.swiper.destroy === 'function') {
        try {
          wrap.swiper.destroy(true, true);
        } catch (e) {
          /* ignore */
        }
      }

      var settings = parseWidgetSettings(widget);
      var desktop = parseInt(settings.slides_to_show || '3', 10) || 3;
      var tablet = parseInt(settings.slides_to_show_tablet || '2', 10) || 2;
      var mobile = parseInt(settings.slides_to_show_mobile || '1', 10) || 1;
      var gap =
        settings.image_spacing_custom && settings.image_spacing_custom.size !== undefined
          ? parseInt(settings.image_spacing_custom.size, 10) || 30
          : 30;
      var slideCount = wrap.querySelectorAll('.swiper-slide').length;
      var loop = settings.infinite === 'yes' && slideCount > desktop;
      var paginationEl = widget.querySelector('.swiper-pagination');
      var nextEl = widget.querySelector('.elementor-swiper-button-next, .swiper-button-next');
      var prevEl = widget.querySelector('.elementor-swiper-button-prev, .swiper-button-prev');
      var swiperOptions = {
        slidesPerView: mobile,
        slidesPerGroup: parseInt(settings.slides_to_scroll || '1', 10) || 1,
        spaceBetween: gap,
        loop: loop,
        speed: parseInt(settings.speed || '500', 10) || 500,
        watchOverflow: true,
        observer: true,
        observeParents: true,
        allowTouchMove: true,
        pagination: paginationEl ? { el: paginationEl, clickable: true } : undefined,
        navigation:
          nextEl || prevEl
            ? { nextEl: nextEl || undefined, prevEl: prevEl || undefined }
            : undefined,
        breakpoints: {
          768: { slidesPerView: tablet, spaceBetween: gap },
          1025: { slidesPerView: desktop, spaceBetween: gap },
        },
      };

      if (settings.autoplay === 'yes') {
        swiperOptions.autoplay = {
          delay: parseInt(settings.autoplay_speed || '5000', 10) || 5000,
          disableOnInteraction: settings.pause_on_interaction === 'yes',
          pauseOnMouseEnter: settings.pause_on_hover === 'yes',
        };
      }

      try {
        // eslint-disable-next-line no-new
        new Swiper(wrap, swiperOptions);
        widget.dataset.astroLoopCarousel = '1';
      } catch (e) {
        console.warn('[astro-mirror-fixes] loop carousel', e);
      }
    });
  }

  /** Extract YouTube video id from common URL shapes */
  function youtubeIdFromUrl(url) {
    if (!url) return '';
    var decoded = String(url)
      .replace(/\\\//g, '/')
      .replace(/&amp;/g, '&')
      .trim();
    var m =
      decoded.match(/[?&]v=([A-Za-z0-9_-]{6,})/) ||
      decoded.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) ||
      decoded.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/) ||
      decoded.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : '';
  }

  /**
   * Elementor video widgets dump an empty .elementor-video shell — Elementor JS
   * normally injects the iframe. If that handler never attaches, embed the
   * YouTube player ourselves from data-settings.
   */
  function ensureElementorVideos() {
    document.querySelectorAll('.elementor-widget-video').forEach(function (widget) {
      if (widget.dataset.astroVideo === '1') return;
      var wrap = widget.querySelector('.elementor-wrapper');
      var host = widget.querySelector('.elementor-video');
      if (!wrap || !host) return;
      if (host.querySelector('iframe, video, .rll-youtube-player')) {
        widget.dataset.astroVideo = '1';
        return;
      }

      var settings = parseWidgetSettings(widget);
      var videoType = settings.video_type || 'youtube';
      if (videoType !== 'youtube') return;

      var id = youtubeIdFromUrl(settings.youtube_url || settings.youtube_id || '');
      if (!id) return;

      var params = ['feature=oembed', 'rel=0'];
      if (settings.controls === 'yes' || settings.controls === true || settings.controls === undefined) {
        params.push('controls=1');
      } else {
        params.push('controls=0');
      }
      if (settings.autoplay === 'yes') params.push('autoplay=1');
      if (settings.mute === 'yes') params.push('mute=1');
      if (settings.loop === 'yes') {
        params.push('loop=1');
        params.push('playlist=' + id);
      }

      var iframe = document.createElement('iframe');
      iframe.className = 'elementor-video-iframe';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      );
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.setAttribute('title', 'YouTube video player');
      iframe.setAttribute('loading', 'lazy');
      iframe.src = 'https://www.youtube.com/embed/' + id + '?' + params.join('&');

      // Prefer replacing empty host so Elementor aspect-ratio CSS still applies
      host.innerHTML = '';
      if (host.tagName === 'DIV') {
        host.appendChild(iframe);
      } else {
        host.replaceWith(iframe);
      }

      if (!wrap.style.getPropertyValue('--video-aspect-ratio')) {
        wrap.style.setProperty('--video-aspect-ratio', '1.77777');
      }
      widget.dataset.astroVideo = '1';
    });
  }

  /** Happy Addons staff/image carousel (hajs-slick) */
  function ensureHaCarousel() {
    var $ = window.jQuery;
    if (!$ || !$.fn || !$.fn.slick) return;

    document.querySelectorAll('.elementor-widget-ha-carousel .hajs-slick').forEach(function (el) {
      var $el = $(el);
      if ($el.hasClass('slick-initialized') || el.dataset.astroHaCarousel === '1') return;

      var widget = el.closest('.elementor-widget-ha-carousel') || el.parentElement;
      var settings = parseWidgetSettings(widget);
      var desktop = parseInt(settings.slides_to_show || '5', 10) || 5;
      var tablet = parseInt(settings.slides_to_show_tablet || '3', 10) || 3;
      var mobile = parseInt(settings.slides_to_show_mobile || '2', 10) || 2;
      var opts = {
        slidesToShow: desktop,
        slidesToScroll: 1,
        infinite: settings.loop !== 'no',
        autoplay: settings.autoplay === 'yes',
        autoplaySpeed: parseInt(settings.autoplay_speed || '3000', 10) || 3000,
        speed: parseInt(settings.animation_speed || '300', 10) || 300,
        arrows: settings.navigation === 'arrow' || settings.navigation === 'both',
        dots: settings.navigation === 'dots' || settings.navigation === 'both',
        responsive: [
          { breakpoint: 1025, settings: { slidesToShow: tablet } },
          { breakpoint: 768, settings: { slidesToShow: mobile } },
        ],
      };

      try {
        $el.slick(opts);
        el.dataset.astroHaCarousel = '1';
      } catch (e) {
        console.warn('[astro-mirror-fixes] ha carousel', e);
      }
    });
  }

  /** WP Rocket / Elementor / Swiper lazy images: promote data-lazy-src + data-src to real src */
  function ensureLazyImages() {
    function getNoscriptFallbackSrc(img) {
      var sibling = img.nextElementSibling;
      if (!sibling || sibling.tagName !== 'NOSCRIPT') return '';
      var html = sibling.textContent || sibling.innerHTML || '';
      var match = html.match(/<img[^>]*\ssrc=['"]([^'"]+)['"]/i);
      return match ? String(match[1]).trim() : '';
    }

    document.querySelectorAll('img[data-lazy-src], img[data-src], img.swiper-lazy').forEach(function (img) {
      var lazySrc = img.getAttribute('data-lazy-src') || img.getAttribute('data-src');
      if (!lazySrc) return;
      var current = img.getAttribute('src') || '';
      if (!current || current.indexOf('data:image') === 0 || current !== lazySrc) {
        img.setAttribute('src', lazySrc);
      }
      var lazySrcset = img.getAttribute('data-lazy-srcset') || img.getAttribute('data-srcset');
      if (lazySrcset && !img.getAttribute('srcset')) {
        img.setAttribute('srcset', lazySrcset);
      }
      var lazySizes = img.getAttribute('data-lazy-sizes');
      if (lazySizes && !img.getAttribute('sizes')) {
        img.setAttribute('sizes', lazySizes);
      }

      if (img.dataset.astroImgRecover !== '1') {
        img.dataset.astroImgRecover = '1';
        img.addEventListener(
          'error',
          function () {
            var fallback =
              img.getAttribute('data-lazy-src') ||
              img.getAttribute('data-src') ||
              getNoscriptFallbackSrc(img);
            if (!fallback) return;
            if (img.getAttribute('src') === fallback) return;
            img.setAttribute('src', fallback);
          },
          { once: true },
        );
      }

      img.removeAttribute('data-lazy-src');
      img.removeAttribute('data-src');
      img.removeAttribute('data-lazy-srcset');
      img.removeAttribute('data-srcset');
      img.removeAttribute('data-lazy-sizes');
      img.classList.remove('swiper-lazy');
      img.classList.add('swiper-lazy-loaded');
      var slide = img.closest('.swiper-slide, .swiper-slide-inner, figure');
      if (slide) {
        slide.querySelectorAll('.swiper-lazy-preloader').forEach(function (el) {
          el.remove();
        });
      }
    });
    // Also drop orphan preloaders when images already have real src
    document.querySelectorAll('.swiper-lazy-preloader').forEach(function (el) {
      var slide = el.closest('.swiper-slide, .swiper-slide-inner, figure');
      var img = slide && slide.querySelector('img');
      var src = img && img.getAttribute('src');
      if (src && src.indexOf('data:image') !== 0) el.remove();
    });
  }

  /**
   * Mobile picks smaller srcset candidates (e.g. -300x191.jpg). Those WP resize
   * variants are often missing locally even when the full-size `src` exists.
   * Prefer the main src, and on error strip -WxH and retry.
   */
  function fixResponsiveImages() {
    function toFullSizeUrl(url) {
      if (!url) return '';
      return String(url).replace(/-\d+x\d+(?=\.(?:jpe?g|png|gif|webp|avif)(?:\?|$))/i, '');
    }

    document.querySelectorAll('img[srcset]').forEach(function (img) {
      var src = img.getAttribute('src') || '';
      if (!src || src.indexOf('data:image') === 0) return;
      // Keep full-size src; drop srcset so narrow viewports don't request missing -WxH files.
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
    });

    if (window.__astroImgErrorBound) return;
    window.__astroImgErrorBound = true;
    document.addEventListener(
      'error',
      function (event) {
        var img = event.target;
        if (!img || img.tagName !== 'IMG') return;
        var current = img.getAttribute('src') || '';
        if (!current || current.indexOf('data:image') === 0) return;

        // 1) Strip WP -WxH size suffix and retry once
        if (!img.dataset.astroImgFallback) {
          var full = toFullSizeUrl(current);
          if (full && full !== current) {
            img.dataset.astroImgFallback = '1';
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
            img.setAttribute('src', full);
            return;
          }
        }

        // 2) Try alternate extensions (webp↔jpg/png) once
        if (!img.dataset.astroImgExtFallback) {
          var alt = '';
          if (/\.webp(?:\?|$)/i.test(current)) alt = current.replace(/\.webp(?:\?|$)/i, '.jpg');
          else if (/\.jpe?g(?:\?|$)/i.test(current)) alt = current.replace(/\.jpe?g(?:\?|$)/i, '.webp');
          else if (/\.png(?:\?|$)/i.test(current)) alt = current.replace(/\.png(?:\?|$)/i, '.webp');
          if (alt && alt !== current) {
            img.dataset.astroImgExtFallback = '1';
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
            img.setAttribute('src', alt);
            return;
          }
        }

        // 3) Blog list cards: fallback image instead of blank broken area
        if (img.closest('.filter-post .main-post.post-wrap .post-img')) {
          var fallback = '/wp-content/uploads/2024/02/Contact-banner.png';
          if (current !== fallback) {
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
            img.setAttribute('src', fallback);
            return;
          }
        }

        // 4) Non-blog assets: hide irrecoverably broken images
        img.dataset.rvBroken = '1';
        img.setAttribute('data-rv-broken', '1');
        img.removeAttribute('srcset');
        img.alt = img.alt || '';
      },
      true,
    );
  }

  /** Bootstrap collapse accordions (FAQ page — WPBakery/Pixfort) */
  function ensureBootstrapCollapseAccordions() {
    document.querySelectorAll('.accordion[id]').forEach(function (accordion) {
      if (accordion.dataset.astroBootstrapAccordion) return;
      accordion.dataset.astroBootstrapAccordion = '1';

      accordion.querySelectorAll('[data-toggle="collapse"], [data-bs-toggle="collapse"]').forEach(function (btn) {
        if (btn.dataset.astroCollapseBound) return;
        btn.dataset.astroCollapseBound = '1';

        var targetSel = btn.getAttribute('data-target') || btn.getAttribute('data-bs-target');
        if (!targetSel) return;
        var panel = document.querySelector(targetSel);
        if (!panel) return;

        panel.classList.remove('show');
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.add('collapsed');

        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var isOpen = panel.classList.contains('show');

          accordion.querySelectorAll('.collapse').forEach(function (p) {
            p.classList.remove('show');
          });
          accordion.querySelectorAll('[data-toggle="collapse"], [data-bs-toggle="collapse"]').forEach(function (b) {
            b.setAttribute('aria-expanded', 'false');
            b.classList.add('collapsed');
          });

          if (!isOpen) {
            panel.classList.add('show');
            btn.setAttribute('aria-expanded', 'true');
            btn.classList.remove('collapsed');
          }
        });
      });
    });
  }

  /**
   * Pixfort intro / sliding headlines stay opacity:0 until theme JS adds
   * .pix-animate / .animated. Reveal them for the static mirror.
   */
  function ensurePixfortAnimations() {
    document.querySelectorAll('[data-anim-type="pix-sliding-text"]').forEach(function (el) {
      el.classList.add('pix-animate', 'animated');
      el.querySelectorAll('.slide-in-container').forEach(function (c) {
        c.classList.add('animated');
      });
      el.querySelectorAll('.pix-sliding-item').forEach(function (item) {
        item.style.opacity = '1';
        item.style.transform = 'none';
        item.style.filter = 'none';
      });
    });

    document.querySelectorAll('.animate-in, .group-animate-in').forEach(function (el) {
      el.classList.add('animated');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
    });
  }

  /** Elementor nested accordion — smooth open/close like live Elementor */
  /**
   * Nested Elementor accordion (`<details>`). Prefer native open/close —
   * preventDefault + manual height animation was leaving all panels closed.
   */
  function ensureNestedAccordion() {
    document.querySelectorAll('.elementor-widget-n-accordion .e-n-accordion').forEach(function (root) {
      if (root.dataset.astroNestedAccordion) return;
      root.dataset.astroNestedAccordion = '1';

      var maxOne = true;
      var widget = root.closest('.elementor-widget-n-accordion');
      if (widget) {
        var settings = parseWidgetSettings(widget);
        if (settings.max_items_expended === 'multiple') maxOne = false;
      }

      root.querySelectorAll('details.e-n-accordion-item').forEach(function (item) {
        var panel = item.querySelector(':scope > [role="region"], :scope > .e-con');
        // Clear stuck inline styles from older mirror-fixes animations
        if (panel) {
          panel.style.removeProperty('height');
          panel.style.removeProperty('overflow');
          panel.style.removeProperty('opacity');
          panel.style.removeProperty('transition');
          panel.style.removeProperty('display');
        }

        var summary = item.querySelector('summary.e-n-accordion-item-title');
        if (summary) {
          summary.setAttribute('aria-expanded', item.open ? 'true' : 'false');
        }

        item.addEventListener('toggle', function () {
          if (summary) {
            summary.setAttribute('aria-expanded', item.open ? 'true' : 'false');
            summary.setAttribute('tabindex', item.open ? '0' : '-1');
          }
          if (!item.open || !maxOne) return;
          root.querySelectorAll('details.e-n-accordion-item[open]').forEach(function (other) {
            if (other !== item) other.open = false;
          });
        });
      });
    });
  }

  /** Decode Cloudflare email protection placeholders */
  function decodeCloudflareEmails() {
    function decode(hex) {
      if (!hex || hex.length < 4) return '';
      var key = parseInt(hex.slice(0, 2), 16);
      var out = '';
      for (var i = 2; i < hex.length; i += 2) {
        out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
      }
      return out;
    }

    document.querySelectorAll('[data-cfemail]').forEach(function (el) {
      var enc = el.getAttribute('data-cfemail');
      if (!enc) return;
      var email = decode(enc);
      if (email) el.textContent = email;
    });

    document.querySelectorAll('a[href*="/cdn-cgi/l/email-protection"]').forEach(function (a) {
      var span = a.querySelector('[data-cfemail]');
      var email = span ? decode(span.getAttribute('data-cfemail') || '') : 'info@kpmpro.ae';
      a.setAttribute('href', 'mailto:' + email);
      if (span && !span.textContent.trim()) span.textContent = email;
    });
  }

  /** Elementor share buttons (LinkedIn / Facebook) */
  function ensureShareButtons() {
    var pageUrl = encodeURIComponent(window.location.href);
    document.querySelectorAll('.elementor-share-btn').forEach(function (btn) {
      if (btn.dataset.astroShare) return;
      btn.dataset.astroShare = '1';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function () {
        var url = pageUrl;
        if (btn.classList.contains('elementor-share-btn_linkedin')) {
          window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + url, '_blank', 'noopener,noreferrer');
        } else if (btn.classList.contains('elementor-share-btn_facebook')) {
          window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank', 'noopener,noreferrer');
        }
      });
    });
  }

  /** Classic Elementor accordion (FAQ) — reliable toggle (no mid-collapse ghost text) */
  function ensureClassicAccordion() {
    function ensureFaqIcons(root) {
      root.querySelectorAll('.elementor-tab-title').forEach(function (title) {
        if (title.querySelector('.elementor-accordion-icon')) return;
        var icon = document.createElement('span');
        icon.className = 'elementor-accordion-icon elementor-accordion-icon-left';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML =
          '<span class="elementor-accordion-icon-closed"><span class="elementor-accordion-icon-closed-text">+</span></span>' +
          '<span class="elementor-accordion-icon-opened"><span class="elementor-accordion-icon-opened-text">–</span></span>';
        var link = title.querySelector('.elementor-accordion-title');
        if (link) title.insertBefore(icon, link);
        else title.insertBefore(icon, title.firstChild);
      });
    }

    function getContent(title) {
      var contentId = title.getAttribute('aria-controls');
      return contentId ? document.getElementById(contentId) : null;
    }

    function clearAnim(content) {
      if (!content) return;
      if (content._astroAccordionTimer) {
        window.clearTimeout(content._astroAccordionTimer);
        content._astroAccordionTimer = null;
      }
      content.style.removeProperty('height');
      content.style.removeProperty('overflow');
      content.style.removeProperty('opacity');
      content.style.removeProperty('transition');
      content.style.removeProperty('padding-top');
      content.style.removeProperty('padding-bottom');
      content.style.removeProperty('margin-top');
      content.style.removeProperty('margin-bottom');
    }

    function openPanel(title) {
      var content = getContent(title);
      title.classList.add('elementor-active');
      title.setAttribute('aria-expanded', 'true');
      if (!content) return;
      clearAnim(content);
      content.classList.add('elementor-active');
      content.hidden = false;
      content.style.display = 'block';
      content.style.overflow = 'hidden';
      content.style.height = '0px';
      content.style.opacity = '0';
      // Force reflow then animate open
      void content.offsetHeight;
      var target = content.scrollHeight;
      content.style.transition = 'height 280ms ease, opacity 220ms ease';
      content.style.height = target + 'px';
      content.style.opacity = '1';
      content._astroAccordionTimer = window.setTimeout(function () {
        clearAnim(content);
        content.style.removeProperty('display');
      }, 300);
    }

    function closePanel(title) {
      var content = getContent(title);
      title.classList.remove('elementor-active');
      title.setAttribute('aria-expanded', 'false');
      if (!content) return;
      clearAnim(content);
      content.style.display = 'block';
      content.style.overflow = 'hidden';
      content.style.height = content.scrollHeight + 'px';
      content.style.opacity = '1';
      void content.offsetHeight;
      content.style.transition = 'height 240ms ease, opacity 180ms ease';
      content.style.height = '0px';
      content.style.opacity = '0';
      content._astroAccordionTimer = window.setTimeout(function () {
        content.classList.remove('elementor-active');
        content.hidden = true;
        content.style.display = 'none';
        clearAnim(content);
      }, 260);
    }

    function collapseAll(root) {
      root.querySelectorAll('.elementor-tab-title').forEach(function (title) {
        closePanel(title);
      });
    }

    document.querySelectorAll('.elementor-widget-accordion .elementor-accordion').forEach(function (root) {
      if (root.dataset.astroAccordion) return;
      root.dataset.astroAccordion = '1';
      ensureFaqIcons(root);

      // Collapse all by default (match live collapsed FAQ look)
      collapseAll(root);

      // Capture phase so Elementor Pro handlers don't fight us.
      root.addEventListener(
        'click',
        function (e) {
          var title = e.target.closest('.elementor-tab-title');
          if (!title || !root.contains(title)) return;
          if (e.target.closest('.elementor-tab-content')) return;
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
          root.dataset.astroAccordionTouched = '1';

          var willOpen = !title.classList.contains('elementor-active');
          // Close every open panel first (prevents stacked/ghost content)
          root.querySelectorAll('.elementor-tab-title.elementor-active').forEach(function (t) {
            closePanel(t);
          });
          if (willOpen) openPanel(title);
        },
        true,
      );

      root.querySelectorAll('.elementor-tab-title').forEach(function (title) {
        title.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          title.click();
        });
      });
    });

    // Elementor accordion chunk often re-opens a panel after our collapse — reassert closed
    // until the user interacts.
    function reassertCollapsed() {
      document.querySelectorAll('.elementor-widget-accordion .elementor-accordion').forEach(function (root) {
        if (root.dataset.astroAccordion !== '1') return;
        if (root.dataset.astroAccordionTouched === '1') return;
        collapseAll(root);
      });
    }
    setTimeout(reassertCollapsed, 400);
    setTimeout(reassertCollapsed, 1000);
    setTimeout(reassertCollapsed, 2000);
    window.addEventListener('rocket-allScriptsLoaded', reassertCollapsed);
  }

  /** Elementor stretch sections (hero + footer full bleed) */
  function ensureStretchedSections() {
    var sections = document.querySelectorAll('.elementor-section-stretched');
    if (!sections.length) return;

    function stretch() {
      var docWidth = document.documentElement.clientWidth;

      // Let footers escape Bootstrap .container clipping
      document.querySelectorAll('.elementor-location-footer').forEach(function (footer) {
        var wrap = footer.parentElement;
        if (wrap && wrap.classList && wrap.classList.contains('container')) {
          wrap.style.setProperty('max-width', 'none', 'important');
          wrap.style.setProperty('width', '100%', 'important');
          wrap.style.setProperty('padding-left', '0', 'important');
          wrap.style.setProperty('padding-right', '0', 'important');
          wrap.style.setProperty('margin-left', '0', 'important');
          wrap.style.setProperty('margin-right', '0', 'important');
        }
        footer.style.setProperty('width', '100%', 'important');
        footer.style.setProperty('max-width', 'none', 'important');
      });

      sections.forEach(function (section) {
        // Reset before measuring (Elementor stretch pattern)
        section.style.removeProperty('width');
        section.style.removeProperty('left');
        section.style.removeProperty('max-width');
        section.style.removeProperty('position');

        var rect = section.getBoundingClientRect();
        var left = rect.left;
        section.style.setProperty('position', 'relative', 'important');
        section.style.setProperty('width', docWidth + 'px', 'important');
        section.style.setProperty('left', -left + 'px', 'important');
        section.style.setProperty('max-width', '100vw', 'important');
      });
    }

    stretch();
    requestAnimationFrame(stretch);
    if (!window.__astroStretchBound) {
      window.__astroStretchBound = true;
      window.addEventListener('resize', stretch);
    }
  }

  /**
   * CF7 country-phone plugin: restore flag sprites + IP-based dial code.
   * Live site uses ipinfo.io which often fails in static mirrors (CORS/rate limits).
   */
  function ensurePhoneCountryFields() {
    var FLAG_CSS =
      '/wp-content/plugins/country-phone-field-contact-form-7/assets/css/intlTelInput.min.css';
    var FLAG_SELECT_CSS =
      '/wp-content/plugins/country-phone-field-contact-form-7/assets/css/countrySelect.min.css';
    var FLAG_PNG = '/js/phone-flags/flags.png';
    var FLAG_PNG_2X = '/js/phone-flags/flags@2x.png';
    var ITI_JS =
      '/wp-content/plugins/country-phone-field-contact-form-7/assets/js/intlTelInput.min.js';
    var CS_JS =
      '/wp-content/plugins/country-phone-field-contact-form-7/assets/js/countrySelect.min.js';
    var UTILS_JS =
      '/wp-content/plugins/country-phone-field-contact-form-7/assets/js/utils.js';

    function ensureLink(href, id) {
      if (document.getElementById(id) || document.querySelector('link[href*="' + href.split('/').pop() + '"]')) {
        return;
      }
      var link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }

    function ensureScript(src) {
      return new Promise(function (resolve) {
        if (document.querySelector('script[src*="' + src.split('/').pop() + '"]')) {
          resolve();
          return;
        }
        var s = document.createElement('script');
        s.src = src;
        s.onload = function () {
          resolve();
        };
        s.onerror = function () {
          resolve();
        };
        document.head.appendChild(s);
      });
    }

    function waitForPlugin(fnName, maxMs) {
      return new Promise(function (resolve) {
        var start = Date.now();
        (function tick() {
          if (window.jQuery && typeof window.jQuery.fn[fnName] === 'function') {
            resolve(true);
            return;
          }
          if (Date.now() - start > (maxMs || 4000)) {
            resolve(false);
            return;
          }
          setTimeout(tick, 100);
        })();
      });
    }

    function injectFlagSpriteCss() {
      if (document.getElementById('astro-phone-flag-css')) return;
      var style = document.createElement('style');
      style.id = 'astro-phone-flag-css';
      style.textContent =
        '.iti-flag,.country-select .flag,.intl-tel-input .iti-flag{background-image:url("' +
        FLAG_PNG +
        '")!important;background-repeat:no-repeat!important;}' +
        '.intl-tel-input .iti-flag{height:15px;box-shadow:0 0 1px 0 #888;}' +
        /* Beat .contact-home .wpcf7 input{padding:15px 20px!important} which collapses dial-code gap */
        '.contact-home .wpcf7 .intl-tel-input.separate-dial-code input.wpcf7-phonetext,' +
        '.contact-home .wpcf7 .intl-tel-input.allow-dropdown input.wpcf7-phonetext,' +
        '.wpcf7 .intl-tel-input.separate-dial-code input.wpcf7-phonetext,' +
        '.wpcf7 .intl-tel-input.allow-dropdown input.wpcf7-phonetext,' +
        '.intl-tel-input.separate-dial-code input[type=text],' +
        '.intl-tel-input.allow-dropdown input[type=text],' +
        '.intl-tel-input.separate-dial-code input[type=tel]{' +
        'padding-left:118px!important;padding-right:20px!important;}' +
        '.intl-tel-input.separate-dial-code .selected-flag,' +
        '.intl-tel-input.allow-dropdown .selected-flag{min-width:100px!important;}' +
        '@media only screen and (-webkit-min-device-pixel-ratio:2),' +
        'only screen and (min-resolution:192dpi),' +
        'only screen and (min-resolution:2dppx){' +
        '.iti-flag,.country-select .flag,.intl-tel-input .iti-flag{background-image:url("' +
        FLAG_PNG_2X +
        '")!important;background-size:5630px 15px!important;}' +
        '}';
      document.head.appendChild(style);
    }

    /** Keep national digits clear of flag + dial code (theme padding overrides ITI). */
    function syncDialPadding(input) {
      if (!input || !input.style) return;
      var wrap = input.closest('.intl-tel-input');
      if (!wrap) return;
      var flag = wrap.querySelector('.flag-container') || wrap.querySelector('.selected-flag');
      if (!flag) return;
      var w = Math.ceil(flag.getBoundingClientRect().width || 0);
      if (w > 0) {
        input.style.setProperty('padding-left', w + 14 + 'px', 'important');
      }
    }

    function parseCountry(payload) {
      if (!payload) return '';
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          return payload.length === 2 ? payload.toLowerCase() : '';
        }
      }
      var code =
        payload.country_code ||
        payload.countryCode ||
        payload.country ||
        (payload.data && (payload.data.country_code || payload.data.country)) ||
        '';
      if (typeof code !== 'string') return '';
      code = code.trim().toLowerCase();
      // ipwho.is returns full name in "country" and ISO in country_code
      if (code.length > 2 && payload.country_code) {
        code = String(payload.country_code).trim().toLowerCase();
      }
      return code.length === 2 ? code : '';
    }

    function fetchJsonWithTimeout(url, timeoutMs) {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (controller) controller.abort();
      }, timeoutMs || 2500);
      return fetch(url, {
        credentials: 'omit',
        signal: controller ? controller.signal : undefined,
      })
        .then(function (res) {
          if (!res.ok) throw new Error(String(res.status));
          return res.json();
        })
        .finally(function () {
          clearTimeout(timer);
        });
    }

    function lookupCountryByIp() {
      if (window.__GEO_COUNTRY__ && /^[a-z]{2}$/i.test(window.__GEO_COUNTRY__)) {
        window.__astroDetectedCountry = String(window.__GEO_COUNTRY__).toLowerCase();
        return Promise.resolve(window.__astroDetectedCountry);
      }
      if (window.__astroDetectedCountry && /^[a-z]{2}$/.test(window.__astroDetectedCountry)) {
        return Promise.resolve(window.__astroDetectedCountry);
      }
      // Same-origin first (avoids CORS / hung third-party fetches), then public geo APIs.
      var endpoints = [
        '/api/geo/country',
      ];
      var i = 0;
      return new Promise(function (resolve) {
        function next() {
          if (i >= endpoints.length) {
            resolve('');
            return;
          }
          var url = endpoints[i++];
          fetchJsonWithTimeout(url, 3000)
            .then(function (data) {
              var code = parseCountry(data);
              if (code) {
                window.__astroDetectedCountry = code;
                resolve(code);
              } else next();
            })
            .catch(function () {
              next();
            });
        }
        next();
      });
    }

    function syncDialCodeHidden($input) {
      var dial = $input.siblings('.flag-container').find('.selected-flag .selected-dial-code').text();
      var name = $input.attr('name');
      if (!name) return;
      var $hidden = $('input[name="' + name + '-country-code"]');
      if ($hidden.length) $hidden.val(dial);
    }

    function disarmLegacyDialCodeKeyup($) {
      // CF7 country-phone plugin prepends dial codes on every keyup when nationalMode
      // is false / + is stripped — that produced +971971971… while typing.
      try {
        $('.wpcf7-phonetext, input.cg-phone-input').off('keyup');
        $(document).off('keyup', '.wpcf7-phonetext');
      } catch (e) {}
    }

    function applyCountry(code) {
      if (typeof window.jQuery === 'undefined') return;
      var $ = window.jQuery;
      var country = (code || window.__astroDetectedCountry || '').toLowerCase();
      var $phones = $('.wpcf7-phonetext, input.cg-phone-input');
      var $countries = $('.wpcf7-countrytext, input.cg-country-input');

      if (!$phones.length && !$countries.length) return;

      disarmLegacyDialCodeKeyup($);

      $phones.each(function () {
        var $el = $(this);
        try {
          if ($el.data('plugin_intlTelInput') || $el.data('intlTelInput')) {
            // Prefer setCountry when already mounted — avoids destroy races.
            try {
              if (country) {
                $el.intlTelInput('setCountry', country);
                syncDialCodeHidden($el);
              }
              syncDialPadding($el[0]);
              $el.off('countrychange.astroPhonePad').on('countrychange.astroPhonePad', function () {
                syncDialPadding(this);
              });
              return;
            } catch (setErr) {
              try {
                $el.intlTelInput('destroy');
              } catch (destroyErr) {}
            }
          }
        } catch (e) {}
        // Keep only national digits in the input; dial code lives in the flag UI.
        // Prefer IP-detected country; fall back to intl-tel-input auto + our geo lookup.
        try {
          var itiOpts = {
            autoHideDialCode: true,
            autoPlaceholder: 'polite',
            formatOnDisplay: false,
            nationalMode: true,
            separateDialCode: true,
            hiddenInput: 'full_number',
            preferredCountries: ['ae', 'sa', 'pk', 'in', 'gb', 'us'],
            utilsScript: UTILS_JS,
          };
          if (country) {
            itiOpts.initialCountry = country;
            itiOpts.geoIpLookup = null;
          } else {
            itiOpts.initialCountry = 'auto';
            itiOpts.geoIpLookup = function (callback) {
              lookupCountryByIp().then(function (detected) {
                var resolved = detected || 'ae';
                window.__astroDetectedCountry = resolved;
                callback(resolved);
              });
            };
          }
          $el.intlTelInput(itiOpts);
        } catch (initErr) {
          return;
        }
        // Ensure visible value has no leading dial code from prior WP init.
        try {
          var dial = $el.intlTelInput('getSelectedCountryData');
          var cc = dial && dial.dialCode ? String(dial.dialCode) : '';
          var digits = String($el.val() || '').replace(/\D/g, '');
          if (cc) {
            while (digits.indexOf(cc) === 0 && digits.length > cc.length + 4) {
              digits = digits.slice(cc.length);
            }
          }
          $el.val(digits);
        } catch (e2) {}
        syncDialCodeHidden($el);
        syncDialPadding($el[0]);
        $el.off('countrychange.astroPhone').on('countrychange.astroPhone', function () {
          syncDialCodeHidden($(this));
          syncDialPadding(this);
        });
      });

      disarmLegacyDialCodeKeyup($);

      $phones.each(function () {
        var el = this;
        syncDialPadding(el);
        setTimeout(function () {
          syncDialPadding(el);
        }, 100);
        setTimeout(function () {
          syncDialPadding(el);
        }, 500);
      });

      $countries.each(function () {
        var $el = $(this);
        try {
          $el.countrySelect({
            defaultCountry: country || 'ae',
            preferredCountries: ['ae', 'sa', 'pk', 'in', 'gb', 'us'],
          });
        } catch (e2) {}
      });
    }

    ensureLink(FLAG_CSS, 'astro-nbcpf-iti-css');
    ensureLink(FLAG_SELECT_CSS, 'astro-nbcpf-cs-css');
    injectFlagSpriteCss();

    var phones = document.querySelectorAll('.wpcf7-phonetext, input.cg-phone-input');
    var countries = document.querySelectorAll('.wpcf7-countrytext, input.cg-country-input');
    if (!phones.length && !countries.length) return;

    // Allow a fresh run if a previous attempt got stuck in "pending".
    if (window.__astroPhoneCountryApplied) {
      injectFlagSpriteCss();
      if (window.__astroDetectedCountry) applyCountry(window.__astroDetectedCountry);
      return;
    }
    if (window.__astroPhoneCountryPending) {
      injectFlagSpriteCss();
      return;
    }
    window.__astroPhoneCountryPending = true;

    if (typeof window.jQuery === 'undefined') {
      window.__astroPhoneCountryPending = false;
      return;
    }

    // If the WP plugin re-binds its broken keyup after ipinfo returns, disarm again.
    if (!window.__astroPhoneAjaxDisarmBound) {
      window.__astroPhoneAjaxDisarmBound = true;
      window.jQuery(document).ajaxComplete(function () {
        disarmLegacyDialCodeKeyup(window.jQuery);
      });
    }

    var chain = Promise.resolve()
      .then(function () {
        if (typeof window.jQuery.fn.intlTelInput === 'function') return true;
        return ensureScript(ITI_JS).then(function () {
          return waitForPlugin('intlTelInput', 4000);
        });
      })
      .then(function () {
        if (typeof window.jQuery.fn.countrySelect === 'function') return true;
        return ensureScript(CS_JS).then(function () {
          return waitForPlugin('countrySelect', 4000);
        });
      })
      .then(function () {
        // Resolve IP country first (same approach as Connect), then mount the widget.
        return lookupCountryByIp();
      })
      .then(function (code) {
        var resolved = code || 'ae';
        window.__astroDetectedCountry = resolved;
        applyCountry(resolved);
      })
      .catch(function () {
        window.__astroDetectedCountry = window.__astroDetectedCountry || 'ae';
        applyCountry(window.__astroDetectedCountry);
      })
      .then(function () {
        window.__astroPhoneCountryApplied = true;
        window.__astroPhoneCountryPending = false;
      });

    // Absolute safety: never leave the widget stuck pending forever.
    setTimeout(function () {
      if (!window.__astroPhoneCountryPending) return;
      window.__astroPhoneCountryPending = false;
      if (!window.__astroPhoneCountryApplied) {
        applyCountry(window.__astroDetectedCountry || 'ae');
        window.__astroPhoneCountryApplied = true;
      }
    }, 12000);
  }

  // Expose for form reset / late-mounted forms.
  window.ensurePhoneCountryFields = ensurePhoneCountryFields;

  function injectMirrorCss() {
    var style = document.getElementById('astro-mirror-fixes-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'astro-mirror-fixes-css';
      document.head.appendChild(style);
    }
    style.textContent = [
      /* Prevent horizontal scroll from stretched sections on mobile */
      'html,body{overflow-x:clip;max-width:100vw;}',
      /* FAQ affordance — match live Elementor accordion (no fake link underlines) */
      '.elementor-widget-accordion .elementor-tab-title{cursor:pointer;}',
      '.elementor-widget-accordion .elementor-accordion-item{overflow:hidden;}',
      /* Keep closed panels hidden, but do not force height/opacity (breaks smooth open) */
      '.elementor-widget-accordion .elementor-tab-content:not(.elementor-active){display:none;}',
      '.elementor-widget-accordion .elementor-tab-content[hidden]{display:none!important;}',
      '.elementor-widget-accordion .elementor-tab-content.elementor-active{display:block;}',
      '.elementor-widget-accordion .elementor-tab-title .elementor-accordion-title,' +
        '.elementor-widget-accordion .elementor-tab-title a.elementor-accordion-title{' +
        'text-decoration:none!important;color:inherit;font-weight:700;box-shadow:none!important;}' +
        '.elementor-widget-accordion .elementor-tab-title .elementor-accordion-title:hover,' +
        '.elementor-widget-accordion .elementor-tab-title .elementor-accordion-title:focus{' +
        'text-decoration:none!important;}',
      '.elementor-widget-accordion .elementor-accordion-icon{display:inline-flex;align-items:center;justify-content:center;min-width:1.1em;margin-right:10px;float:none;font-size:18px;font-weight:700;line-height:1;color:#121212;}',
      '.elementor-widget-accordion .elementor-tab-title{display:flex;align-items:center;justify-content:flex-start;gap:8px;}',
      '.elementor-widget-accordion .elementor-tab-title .elementor-accordion-title{flex:1;}',
      '.elementor-widget-accordion .elementor-tab-title:not(.elementor-active) .elementor-accordion-icon-opened{display:none!important;}',
      '.elementor-widget-accordion .elementor-tab-title.elementor-active .elementor-accordion-icon-closed{display:none!important;}',
      '.elementor-widget-accordion .elementor-tab-title.elementor-active .elementor-accordion-icon-opened{display:inline-flex!important;}',
      /* Blog Latest Blogs category chips */
      '.catbutton .filter-button{cursor:pointer;}',
      '.catbutton .filter-button.active,.catbutton .filter-button.is-active{background:#5A8C1C!important;color:#fff!important;border-color:#5A8C1C!important;}',
      '.filter-post .main-post.post-wrap{display:grid;grid-template-columns:minmax(260px,40%) minmax(0,1fr);gap:24px;align-items:start;margin-bottom:28px;}',
      '.filter-post .main-post.post-wrap .post-img{min-width:0;}',
      '.filter-post .main-post.post-wrap .post-img img{width:100%;height:auto;display:block;aspect-ratio:16/9;object-fit:cover;background:#f4f5f7;}',
      '@media (max-width:767px){.filter-post .main-post.post-wrap{display:block;}}',
      '.filter-post .main-post.post-wrap.is-hidden{display:none!important;}',
      '.filter-post .main-post.post-wrap.is-load-hidden{display:none!important;}',
      '.astro-blog-load-more-wrap{text-align:center;margin:32px 0 8px;}',
      '.astro-blog-load-more{color:#4A4A4A;font-family:Poppins,sans-serif;font-size:14px;font-weight:600;line-height:20.5px;border-radius:100px;border:1px solid #D9D9D9;padding:12px 32px;background:#fff;cursor:pointer;}',
      '.astro-blog-load-more:hover{background:#121212;color:#fff;border-color:#121212;}',
      '.astro-blog-load-more.is-hidden{display:none!important;}',
      /* Recruitment hero heading: keep two lines and centered on desktop */
      '.astro-recruitment-title-break{display:none;}',
      '.astro-recruitment-line1,.astro-recruitment-line2{display:inline;white-space:normal;}',
      '@media (min-width:1025px){body.page-id-1750 .elementor-element-287c2a2f,body.elementor-page-1750 .elementor-element-287c2a2f,body.page-id-1750 .elementor-element-287c2a2f>.elementor-widget-container,body.elementor-page-1750 .elementor-element-287c2a2f>.elementor-widget-container{display:flex!important;justify-content:center!important;text-align:center!important;}body.page-id-1750 .elementor-element-287c2a2f .elementor-heading-title,body.elementor-page-1750 .elementor-element-287c2a2f .elementor-heading-title{display:flex!important;flex-direction:column;align-items:center;justify-content:center;text-align:center!important;max-width:1120px;margin-left:auto!important;margin-right:auto!important;line-height:1.12;}.astro-recruitment-line1,.astro-recruitment-line2{display:block;white-space:nowrap;text-align:center!important;width:auto;max-width:none;margin-left:auto!important;margin-right:auto!important;}.astro-recruitment-title-break{display:none!important;}}',
      /* Sticky form: ancestor overflow must not clip sticky */
      '@media (min-width:768px){.elementor-section:has(.elementor-element-3595752),.elementor-section:has(.elementor-element-3595752)>.elementor-container,.elementor-section:has(.elementor-element-3595752) .elementor-column,.elementor-section:has(.elementor-element-3595752)>.elementor-container>.elementor-column>.elementor-widget-wrap{overflow:visible!important;}}',
      'img[data-rv-broken]{visibility:hidden;max-height:0;margin:0;padding:0;}',
      /* Bootstrap collapse FAQ (Pixfort / WPBakery) */
      '.accordion [data-toggle="collapse"],.accordion [data-bs-toggle="collapse"]{cursor:pointer;}',
      '.accordion .collapse:not(.show){display:none!important;}',
      '.accordion .collapse.show{display:block!important;}',
      /* Elementor nested accordion — blog FAQ only (exclude marketing page accordions) */
      '.elementor-location-single .elementor-widget-n-accordion .e-n-accordion-item-title{border:1px solid #d5d8dc;background:#f3f4f6;}',
      '.elementor-location-single .elementor-widget-n-accordion .e-n-accordion-item:not(:last-child){margin-bottom:0;}',
      '.elementor-location-single .elementor-widget-n-accordion .e-n-accordion-item[open]>.e-con,.elementor-location-single .elementor-widget-n-accordion .e-n-accordion-item>.e-con{border:1px solid #d5d8dc;border-top:0;background:#f3f4f6;padding:12px 16px;}',
      '.elementor-widget-n-accordion .e-n-accordion-item:not([open]) .e-closed{display:flex!important;}',
      '.elementor-widget-n-accordion .e-n-accordion-item:not([open]) .e-opened{display:none!important;}',
      '.elementor-widget-n-accordion .e-n-accordion-item[open] .e-opened{display:flex!important;}',
      '.elementor-widget-n-accordion .e-n-accordion-item[open] .e-closed{display:none!important;}',
      /* Smooth nested accordion panel (all pages) */
      '.elementor-widget-n-accordion .e-n-accordion-item>.e-con{will-change:height,opacity;}',
      /* Staff outsourcing: blend lavender accordion section into following white section */
      '.elementor-34276 .elementor-element-735da21:not(.elementor-motion-effects-element-type-background),.elementor-34276 .elementor-element-735da21>.elementor-motion-effects-container>.elementor-motion-effects-layer{background-image:linear-gradient(180deg,#FFFFFF 0%,#D4D7F9 55%,#FFFFFF 100%)!important;}',
      /* Share buttons visibility */
      '.elementor-share-buttons--color-official .elementor-share-btn__icon svg{fill:currentColor;}',
      '.elementor-share-btn_linkedin .elementor-share-btn__icon{color:#fff;background:#0077b5;}',
      '.elementor-share-btn_facebook .elementor-share-btn__icon{color:#fff;background:#1877f2;}',
      '.elementor-share-btn__icon{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;}',
      '.elementor-share-btn__icon svg{width:16px;height:16px;}',
      /* Pixfort sliding / animate-in (Privacy Policy intro, etc.) */
      '.animate-in,.group-animate-in{visibility:visible!important;opacity:1!important;}',
      '[data-anim-type="pix-sliding-text"] .pix-sliding-item,[data-anim-type="pix-sliding-text"].pix-animate .pix-sliding-item{opacity:1!important;transform:none!important;filter:none!important;visibility:visible!important;}',
      '[data-anim-type="pix-sliding-text"] .slide-in-container{overflow:visible!important;}',
      /* Nested carousel: keep cards from stacking full-page before Swiper boots */
      '.elementor-widget-n-carousel .e-n-carousel{overflow:hidden;}',
      '.elementor-widget-n-carousel .e-n-carousel:not(.swiper-initialized) .swiper-wrapper{display:flex;gap:12px;}',
      '.elementor-widget-n-carousel .e-n-carousel:not(.swiper-initialized) .swiper-slide{flex:0 0 calc(33.333% - 8px);max-width:calc(33.333% - 8px);}',
      '@media (max-width:1024px){.elementor-widget-n-carousel .e-n-carousel:not(.swiper-initialized) .swiper-slide{flex-basis:calc(50% - 6px);max-width:calc(50% - 6px);}}',
      '@media (max-width:767px){.elementor-widget-n-carousel .e-n-carousel:not(.swiper-initialized) .swiper-slide{flex-basis:100%;max-width:100%;}}',
      /* Stats strip: one slide at a time on mobile, swipe contained inside carousel */
      '@media (max-width:767px){.elementor-widget-n-carousel .e-n-carousel.swiper{width:100%;max-width:100%;overflow:hidden;touch-action:pan-y pinch-zoom;}',
      '.elementor-widget-n-carousel .e-n-carousel.swiper .swiper-slide{width:100%!important;max-width:100%!important;}}',
      /* Testimonial carousel: correct column count before Swiper boots (service cards, reviews, etc.) */
      '.elementor-widget-testimonial-carousel .elementor-main-swiper{overflow:hidden;width:100%;}',
      '.elementor-widget-testimonial-carousel .elementor-main-swiper:not(.swiper-initialized) .swiper-wrapper{display:flex;flex-wrap:nowrap;}',
      '.elementor-widget-testimonial-carousel .elementor-main-swiper:not(.swiper-initialized)[data-astro-spv-desktop="4"] .swiper-slide{flex:0 0 25%;max-width:25%;}',
      '.elementor-widget-testimonial-carousel .elementor-main-swiper:not(.swiper-initialized)[data-astro-spv-desktop="3"] .swiper-slide{flex:0 0 33.333%;max-width:33.333%;}',
      '.elementor-widget-testimonial-carousel .elementor-main-swiper:not(.swiper-initialized)[data-astro-spv-desktop="2"] .swiper-slide{flex:0 0 50%;max-width:50%;}',
      '@media (max-width:1024px){.elementor-widget-testimonial-carousel .elementor-main-swiper:not(.swiper-initialized)[data-astro-spv-tablet="2"] .swiper-slide{flex:0 0 50%;max-width:50%;}',
      '.elementor-widget-testimonial-carousel .elementor-main-swiper:not(.swiper-initialized)[data-astro-spv-tablet="1"] .swiper-slide{flex:0 0 100%;max-width:100%;}}',
      '@media (max-width:767px){.elementor-widget-testimonial-carousel .elementor-main-swiper:not(.swiper-initialized) .swiper-slide{flex:0 0 100%;max-width:100%;}}',
      '@media (min-width:1025px){.astro-tcarousel-all-visible-desktop .swiper-pagination{display:none!important;}}',
      /* Image carousel (client logos): clip row before Swiper boots */
      '.elementor-widget-image-carousel .elementor-image-carousel-wrapper{overflow:hidden;width:100%;}',
      '.elementor-widget-image-carousel .elementor-image-carousel-wrapper:not(.swiper-initialized) .elementor-image-carousel{display:flex;flex-wrap:nowrap;}',
      '.elementor-widget-image-carousel .elementor-image-carousel-wrapper:not(.swiper-initialized) .swiper-slide{flex:0 0 calc(16.666% - 16px);max-width:calc(16.666% - 16px);}',
      '@media (max-width:1024px){.elementor-widget-image-carousel .elementor-image-carousel-wrapper:not(.swiper-initialized) .swiper-slide{flex:0 0 calc(25% - 15px);max-width:calc(25% - 15px);}}',
      '@media (max-width:767px){.elementor-widget-image-carousel .elementor-image-carousel-wrapper:not(.swiper-initialized) .swiper-slide{flex:0 0 calc(50% - 15px);max-width:calc(50% - 15px);}}',
      /* Insights loop-carousel: 3-up before Swiper boots */
      '.elementor-widget-loop-carousel .elementor-loop-container{overflow:hidden;width:100%;}',
      '.elementor-widget-loop-carousel .elementor-loop-container:not(.swiper-initialized) .swiper-wrapper{display:flex;flex-wrap:nowrap;gap:30px;}',
      '.elementor-widget-loop-carousel .elementor-loop-container:not(.swiper-initialized) .swiper-slide{flex:0 0 calc(33.333% - 20px);max-width:calc(33.333% - 20px);}',
      '@media (max-width:1024px){.elementor-widget-loop-carousel .elementor-loop-container:not(.swiper-initialized) .swiper-slide{flex:0 0 calc(50% - 15px);max-width:calc(50% - 15px);}}',
      '@media (max-width:767px){.elementor-widget-loop-carousel .elementor-loop-container:not(.swiper-initialized) .swiper-slide{flex:0 0 100%;max-width:100%;}}',
      /* Happy Addons staff carousel: horizontal row before slick boots */
      '.elementor-widget-ha-carousel .hajs-slick:not(.slick-initialized){display:flex;flex-wrap:nowrap;overflow:hidden;gap:12px;}',
      '.elementor-widget-ha-carousel .hajs-slick:not(.slick-initialized) .ha-slick-slide{flex:0 0 20%;max-width:20%;}',
      '@media (max-width:1024px){.elementor-widget-ha-carousel .hajs-slick:not(.slick-initialized) .ha-slick-slide{flex:0 0 33.333%;max-width:33.333%;}}',
      '@media (max-width:767px){.elementor-widget-ha-carousel .hajs-slick:not(.slick-initialized) .ha-slick-slide{flex:0 0 50%;max-width:50%;}}',
      /* Elementor YouTube video fallback */
      '.elementor-widget-video .elementor-wrapper{position:relative;width:100%;aspect-ratio:var(--video-aspect-ratio,1.77777);}',
      '.elementor-widget-video .elementor-video,.elementor-widget-video .elementor-video-iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000;}',
      /* Menu toggle: CSS hamburger/X (avoids wrong eicons glyph \\e813 = Elementor logo) */
      '.elementor-menu-toggle{display:inline-flex;align-items:center;justify-content:center;}',
      '.elementor-menu-toggle__icon--open.eicon-menu-bar,.elementor-menu-toggle__icon--close.eicon-close{font-size:0!important;line-height:0!important;speak:none;font-style:normal;position:relative;display:inline-block;color:inherit;}',
      '.elementor-menu-toggle__icon--open.eicon-menu-bar{width:22px;height:14px;}',
      '.elementor-menu-toggle__icon--open.eicon-menu-bar:before{content:""!important;display:block;width:100%;height:2px;border-radius:1px;background:currentColor;box-shadow:0 6px 0 currentColor,0 12px 0 currentColor;}',
      '.elementor-menu-toggle__icon--close.eicon-close{width:18px;height:18px;}',
      '.elementor-menu-toggle__icon--close.eicon-close:before,.elementor-menu-toggle__icon--close.eicon-close:after{content:""!important;position:absolute;left:0;top:50%;width:100%;height:2px;margin-top:-1px;border-radius:1px;background:currentColor;}',
      '.elementor-menu-toggle__icon--close.eicon-close:before{transform:rotate(45deg);}',
      '.elementor-menu-toggle__icon--close.eicon-close:after{transform:rotate(-45deg);}',
      '.elementor-menu-toggle:not(.elementor-active) .elementor-menu-toggle__icon--close{display:none;}',
      '.elementor-menu-toggle.elementor-active .elementor-menu-toggle__icon--open{display:none;}',
      /* Submenu caret: match Elementor live (1em SVG + padded flex hit area) */
      '.elementor-nav-menu .sub-arrow{align-items:center;display:inline-flex;line-height:1;margin-block:-10px;margin-inline-start:.15em;padding:10px;padding-inline-end:0;vertical-align:middle;}',
      '.elementor-nav-menu .sub-arrow .e-font-icon-svg,.elementor-nav-menu .sub-arrow svg{width:1em!important;height:1em!important;fill:currentColor;display:block;}',
      '.elementor-nav-menu .sub-arrow + .sub-arrow{display:none!important;}',
      '.e-font-icon-svg{height:1em;width:1em;fill:currentColor;display:inline-block;vertical-align:-.125em;}',
      '.elementor-button-icon .fas,.elementor-button-icon .fa{margin-inline-end:.4em;}',
      /* overflow-x:hidden on html/body breaks position:sticky in Chrome — use clip instead */
      'html,body{overflow-x:clip!important;}',
      /* Single-post sidebar contact form: CSS sticky (sticky_offset:100). */
      '@media (min-width:768px){.elementor-element-f006bfc{position:-webkit-sticky!important;position:sticky!important;top:100px!important;z-index:10;align-self:flex-start;width:100%;}',
      '.elementor-element-966b194,.elementor-element-966b194 > .elementor-widget-wrap{overflow:visible!important;}',
      /* KPM Pro blog sticky_form: clear sticky header (was top:40px and clipped). */
      '.sticky_form,.elementor-element-a13bdb2.sticky_form{position:-webkit-sticky!important;position:sticky!important;top:110px!important;z-index:10;align-self:flex-start;}}',
      /* Contact form response — readable on light cards; .form-design keeps white on dark/green forms */
      '.wpcf7-form .wpcf7-response-output{display:none;margin:12px 0 .5em;padding:.75em 1em;border:2px solid #0f2a48;background:#f4f7fb;color:#0f2a48;border-radius:6px;font-size:14px;line-height:1.45;min-height:1.4em;text-align:center;font-weight:600;}',
      '.wpcf7-form .wpcf7-response-output.wpcf7-mail-sent-ok,.wpcf7 form.sent .wpcf7-response-output{display:block!important;color:#0a7a3e!important;border-color:#0a7a3e!important;background:#e8f8ef!important;text-align:center;margin-top:12px!important;}',
      '.wpcf7-form .wpcf7-response-output.wpcf7-mail-sent-ng,.wpcf7-form .wpcf7-response-output.wpcf7-validation-errors,.wpcf7 form.invalid .wpcf7-response-output{display:block!important;color:#b42318!important;border-color:#b42318!important;background:#fef3f2!important;text-align:center;margin-top:12px!important;}',
      '.wpcf7-form input.astro-field-error,.wpcf7-form textarea.astro-field-error{outline:2px solid #dc3232;outline-offset:1px;}',
      '.wpcf7-form .astro-experience-tip,.wpcf7-form .wpcf7-not-valid-tip{display:block;color:#dc3232;font-size:12px;margin-top:8px;line-height:1.3;}',
      '.form-design .wpcf7-response-output,.form-design .wpcf7-response-output.wpcf7-mail-sent-ok,.form-design .wpcf7-response-output.wpcf7-mail-sent-ng,.form-design .wpcf7-response-output.wpcf7-validation-errors{color:#fff!important;border-color:#fff!important;background:rgba(0,0,0,.18)!important;}',
      '.form-design .astro-experience-tip,.form-design .wpcf7-not-valid-tip{color:#ff6b6b;}',
      /* Footer full bleed */
      '.elementor-location-footer,.elementor-location-footer .elementor-section-stretched{width:100%!important;max-width:none!important;}',
      'body .container:has(> .elementor-location-footer){max-width:none!important;width:100%!important;padding-left:0!important;padding-right:0!important;margin-left:0!important;margin-right:0!important;}',
      /* Sticky header above sticky sidebar forms (both default to z-index 99).
         Do NOT force top — that breaks Elementor sticky_parent parking (bottom:0)
         and stretches the form over the footer. */
      '.elementor-location-header .elementor-sticky--active,.elementor-element-6f7aa16.elementor-sticky--active,.elementor-element-e1ad642.elementor-sticky--active{z-index:1000!important;}',
      '.blog-form.elementor-sticky--active,.elementor-element-0933e6e.elementor-sticky--active,.elementor-element-16a1fb7.elementor-sticky--active,.elementor-element-d0c0271.elementor-sticky--active,.elementor-element-f006bfc.elementor-sticky--active{z-index:10!important;}',
      /* Sidebar CF7: force full-width controls inside green sticky card */
      '.elementor-element-f006bfc .contactform label{display:block;width:100%;margin:0 0 12px;}',
      '.elementor-element-f006bfc .contactform input:not([type=submit]):not([type=checkbox]):not([type=hidden]),.elementor-element-f006bfc .contactform textarea,.elementor-element-f006bfc .contactform .wpcf7-form-control-wrap,.elementor-element-f006bfc .contactform .iti{width:100%!important;max-width:100%!important;box-sizing:border-box!important;}',
      '.elementor-element-f006bfc .contactform input[type=submit]{width:100%!important;}',
      '.elementor-element-f006bfc .elementor-heading-title{color:#fff;}',
    ].join('');
  }

  /** Classic Elementor tabs (brands category pills) */
  function ensureClassicTabs() {
    document.querySelectorAll('.elementor-widget-tabs').forEach(function (widget) {
      if (widget.dataset.astroTabs) return;
      var root = widget.querySelector('.elementor-tabs');
      if (!root) return;
      widget.dataset.astroTabs = '1';

      function activate(tabIndex) {
        var titles = root.querySelectorAll('.elementor-tab-title[data-tab="' + tabIndex + '"]');
        var content = root.querySelector('.elementor-tab-content[data-tab="' + tabIndex + '"]');
        if (!content) return;

        root.querySelectorAll('.elementor-tab-title').forEach(function (t) {
          var on = t.getAttribute('data-tab') === String(tabIndex);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.setAttribute('aria-expanded', on ? 'true' : 'false');
          t.setAttribute('tabindex', on ? '0' : '-1');
          t.classList.toggle('elementor-active', on);
        });

        root.querySelectorAll('.elementor-tab-content').forEach(function (c) {
          var on = c.getAttribute('data-tab') === String(tabIndex);
          c.hidden = !on;
          // Elementor CSS sets .elementor-tab-content { display:none } — must force block
          c.style.setProperty('display', on ? 'block' : 'none', 'important');
          c.classList.toggle('elementor-active', on);
        });
      }

      root.addEventListener('click', function (e) {
        var title = e.target.closest('.elementor-tab-title');
        if (!title || !root.contains(title)) return;
        e.preventDefault();
        activate(title.getAttribute('data-tab'));
      });

      // Ensure initial panel is visible (WP Rocket dumps often leave odd hidden attrs)
      var selected =
        root.querySelector('.elementor-tab-title[aria-selected="true"]') ||
        root.querySelector('.elementor-tab-title[data-tab="1"]');
      if (selected) activate(selected.getAttribute('data-tab'));
    });
  }

  /** Nested Elementor tabs (mega-menu / other n-tabs widgets) */
  function ensureNestedTabs() {
    document.querySelectorAll('.e-n-tabs').forEach(function (root) {
      // Allow re-bind if Elementor left tabs inert (no e-activated after load)
      if (root.dataset.astroNestedTabs === '1') return;
      root.dataset.astroNestedTabs = '1';

      function activate(title) {
        if (!title) return;
        var controls = title.getAttribute('aria-controls');
        var titles = root.querySelectorAll('.e-n-tab-title');
        var panels = root.querySelectorAll('.e-n-tabs-content > [role="tabpanel"], .e-n-tabs-content > .e-con');

        titles.forEach(function (t) {
          var on = t === title;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.setAttribute('tabindex', on ? '0' : '-1');
          t.classList.toggle('e-active', on);
        });

        panels.forEach(function (panel) {
          var on = panel.id === controls;
          panel.classList.toggle('e-active', on);
          panel.style.setProperty('display', on ? 'flex' : 'none', 'important');
          panel.hidden = !on;
          if (on) {
            panel.style.removeProperty('height');
            panel.style.removeProperty('opacity');
          }
        });
        root.classList.add('e-activated');
      }

      root.addEventListener('click', function (e) {
        var title = e.target.closest('.e-n-tab-title');
        if (!title || !root.contains(title)) return;
        e.preventDefault();
        activate(title);
      });

      var selected =
        root.querySelector('.e-n-tab-title[aria-selected="true"]') ||
        root.querySelector('.e-n-tab-title');
      activate(selected);
    });
  }
  window.__astroEnsureNestedTabs = ensureNestedTabs;

  function wireLegacyContactForms() {
    if (window.__astroLegacyContactFormsWired) return;
    window.__astroLegacyContactFormsWired = true;
    try { resolveInitialLandingUrl(); } catch (e) {}

    function ensureHiddenField(form, name, value) {
      var input = form.querySelector('[name="' + name + '"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.appendChild(input);
      }
      if (value !== undefined) input.value = value || '';
      return input;
    }

    function getAttrCookie(name) {
      var nameEQ = name + '=';
      var parts = document.cookie.split(';');
      for (var i = 0; i < parts.length; i++) {
        var c = parts[i].trim();
        if (c.indexOf(nameEQ) === 0) {
          try {
            return decodeURIComponent(c.substring(nameEQ.length));
          } catch (e) {
            return c.substring(nameEQ.length);
          }
        }
      }
      return '';
    }

    function setAttrCookie(name, value, days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      var secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie =
        name +
        '=' +
        encodeURIComponent(String(value == null ? '' : value)) +
        '; expires=' +
        d.toUTCString() +
        '; path=/; SameSite=Lax' +
        secure;
    }

    function resolveInitialLandingUrl() {
      var pageUrl = window.location.href;
      var fromCookie = getAttrCookie('initialUrl') || getAttrCookie('cg_initial_url');
      if (fromCookie) return fromCookie;
      try {
        var fromSession = sessionStorage.getItem('cg_initial_url');
        if (fromSession) {
          setAttrCookie('initialUrl', fromSession, 30);
          return fromSession;
        }
      } catch (e) {}
      setAttrCookie('initialUrl', pageUrl, 30);
      try {
        sessionStorage.setItem('cg_initial_url', pageUrl);
      } catch (e) {}
      return pageUrl;
    }

    function pushLeadToDataLayer(email, phone, submissionId) {
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'form_submission_lead',
          email: email || '',
          phone_number: phone || '',
          submission_id: submissionId || '',
        });
      } catch (e) {}
    }


    function ensureLegacyTrackingFields(form) {
      if (!form.dataset.submissionId) {
        form.dataset.submissionId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
      }
      var pageUrl = window.location.href;
      var initial = (typeof resolveInitialLandingUrl === 'function' ? resolveInitialLandingUrl() : (sessionStorage.getItem('cg_initial_url') || pageUrl));
      ensureHiddenField(form, 'form_name', 'KPM Pro Contact Form');
      ensureHiddenField(form, 'form_id', form.id || 'legacy-contact-form');
      ensureHiddenField(form, 'page_url', pageUrl);
      ensureHiddenField(form, 'submission_page_url', pageUrl);
      ensureHiddenField(form, 'landing_page_url', initial);
      ensureHiddenField(form, 'referrer_url', document.referrer || '');
      ensureHiddenField(form, 'submission_id', form.dataset.submissionId);
    }

    function captureTrackingFields(form) {
      var params = new URLSearchParams(window.location.search || '');
      var hashParams = new URLSearchParams((window.location.hash || '').replace(/^#\??/, ''));
      function paramHas(key) {
        return params.has(key) || hashParams.has(key);
      }
      function paramGet(key) {
        if (params.has(key)) return params.get(key) || '';
        if (hashParams.has(key)) return hashParams.get(key) || '';
        return '';
      }
      var pageUrl = window.location.href;
      var initial = resolveInitialLandingUrl();
      if (typeof ensureLegacyTrackingFields === 'function') {
        ensureLegacyTrackingFields(form);
      }

      var TRACKING_FIELDS = {
        gclid: ['gclid', 'gbraid', 'wbraid'],
        gbraid: ['gbraid'],
        wbraid: ['wbraid'],
        fbclid: ['fbclid'],
        msclkid: ['msclkid'],
        twclid: ['twclid'],
        utm_source: ['utm_source'],
        utm_medium: ['utm_medium'],
        utm_campaign: ['utm_campaign'],
        utm_term: ['utm_term'],
        utm_content: ['utm_content'],
        campaign_id: ['campaign_id', 'campaignid', 'gad_campaignid', 'campaign'],
        adgroup_id: ['adgroup_id', 'adgroupid'],
        group_id: ['group_id', 'groupid'],
        creative_id: ['creative_id', 'creativeid', 'creative'],
        keyword: ['keyword', 'kw', 'q', 'utm_term'],
        matchtype: ['matchtype', 'match_type'],
        device: ['device', 'utm_device'],
        network: ['network'],
        placement: ['placement', 'displayad'],
        target: ['target', 'targetid', 'target_id'],
        target_id: ['target_id', 'targetid', 'target'],
        adposition: ['adposition', 'ad_position'],
        loc_physical_ms: ['loc_physical_ms', 'locphysicalms'],
        loc_interest_ms: ['loc_interest_ms', 'locinterestms'],
        gad_source: ['gad_source', 'gadsource'],
        source: ['source', 'gad_source', 'gadsource'],
      };

      function firstParam(aliases) {
        for (var i = 0; i < aliases.length; i++) {
          var alias = aliases[i];
          if (paramHas(alias)) return String(paramGet(alias) || '').trim();
        }
        return '';
      }

      Object.keys(TRACKING_FIELDS).forEach(function (name) {
        var fromUrl = firstParam(TRACKING_FIELDS[name]);
        var value = fromUrl;
        if (fromUrl) {
          setAttrCookie(name, fromUrl, 30);
        } else {
          value = getAttrCookie(name) || '';
        }
        if (name === 'gclid' && !value) {
          value = getAttrCookie('gclid') || getAttrCookie('gbraid') || getAttrCookie('wbraid') || '';
        }
        ensureHiddenField(form, name, value);
      });

      var urlGclid = String(paramGet('gclid') || paramGet('gbraid') || paramGet('wbraid') || '').trim();
      if (urlGclid) {
        setAttrCookie('gclid', urlGclid, 30);
        ensureHiddenField(form, 'gclid', urlGclid);
      }

      ensureHiddenField(form, 'initial_url', initial);
      ensureHiddenField(form, 'landing_page_url', initial);
      ensureHiddenField(form, 'page_url', pageUrl);
      ensureHiddenField(form, 'submission_page_url', pageUrl);
      ensureHiddenField(form, 'referrer_url', document.referrer || '');
    }


    function normalizeNationalPhoneDigits(phone, dialCode) {
      var digits = String(phone.value || '').replace(/\D/g, '');
      var cc = String(dialCode || '').replace(/\D/g, '');
      // Strip duplicated country codes from the broken CF7 keyup / getNumber pollution.
      if (cc) {
        while (digits.indexOf(cc) === 0 && digits.length > cc.length + 4) {
          digits = digits.slice(cc.length);
        }
      }
      return digits;
    }

    function fieldContainsLink(value) {
      var text = String(value || '');
      if (!text) return false;
      return (
        /https?:\/\//i.test(text) ||
        /www\./i.test(text) ||
        /\[[^\]]+\]\([^)]+\)/.test(text) ||
        /<\s*a\s/i.test(text) ||
        // Require boundary before host so emails like test@gmail.com are not flagged
        /(^|[\s/])[a-z0-9.-]+\.(com|net|org|io|co|info|biz|xyz|online|site|ru|cn)([/\s?]|$)/i.test(text)
      );
    }

    function fieldContainsHtml(value) {
      return /<\s*\/?\s*[a-z][^>]*>/i.test(String(value || ''));
    }

    function isTrackingOrMetaField(el) {
      var name = String((el && (el.name || el.id)) || '').toLowerCase();
      if (!name) return false;
      if (/(_url|page_url|initial_url|landing_page|submission_page|referrer)/.test(name)) return true;
      if (/^(utm_|gclid|gbraid|wbraid|fbclid|msclkid)/.test(name)) return true;
      if (/^(campaign|adgroup|creative|keyword|matchtype|device|network|placement|target|adposition|loc_)/.test(name)) {
        return true;
      }
      if (/^(form_name|form_id|submission_id|_wpcf7)/.test(name)) return true;
      return false;
    }

    function isVisibleFormControl(el) {
      if (!el) return false;
      if (el.type === 'hidden') return false;
      var style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (el.offsetParent === null && !(el.getClientRects && el.getClientRects().length)) return false;
      return true;
    }

    function syncPhoneNumbers(form) {
      form.querySelectorAll('.wpcf7-phonetext, input.cg-phone-input, input[name^="phonetext"], input[name="phone"]').forEach(function (phone) {
        try {
          var dialCode = '';
          var full = '';
          if (window.jQuery) {
            var $phone = window.jQuery(phone);
            if ($phone.data('plugin_intlTelInput')) {
              var dial = $phone.intlTelInput('getSelectedCountryData');
              if (dial && dial.dialCode) dialCode = String(dial.dialCode);
              var national = normalizeNationalPhoneDigits(phone, dialCode);
              phone.value = national;
              // Rebuild full E.164 from national digits + dial code (do not write into visible input).
              if (national) {
                try {
                  full = $phone.intlTelInput('getNumber') || '';
                } catch (e1) {
                  full = '';
                }
                if (!full || full.replace(/\D/g, '').indexOf(national) < 0) {
                  full = '+' + dialCode + national;
                }
              }
              var hiddenName = phone.getAttribute('name') + '-country-code';
              var hidden = form.querySelector('[name="' + hiddenName + '"]');
              if (dialCode && hidden) hidden.value = '+' + dialCode;
              phone.dataset.astroFullPhone = full || (national ? '+' + dialCode + national : '');
              return;
            }
          }
          phone.value = normalizeNationalPhoneDigits(phone, dialCode);
          phone.dataset.astroFullPhone = phone.value ? phone.value : '';
        } catch (e) {
          phone.value = String(phone.value || '').replace(/\D/g, '');
        }
      });
    }

    function buildContactFormPayload(form) {
      syncPhoneNumbers(form);
      var snapshots = [];
      form.querySelectorAll('.wpcf7-phonetext, input.cg-phone-input, input[name^="phonetext"], input[name="phone"]').forEach(function (phone) {
        snapshots.push({ el: phone, value: phone.value });
        if (phone.dataset.astroFullPhone) phone.value = phone.dataset.astroFullPhone;
      });
      var body = new FormData(form);
      snapshots.forEach(function (snap) {
        snap.el.value = snap.value;
      });
      // JSON body — Astro checkOrigin only blocks cross-site *form* POSTs (FormData /
      // urlencoded). Behind Caddy TLS that check misfires unless allowedDomains is set.
      var payload = {};
      var arrays = {};
      body.forEach(function (value, key) {
        if (typeof value !== 'string') return;
        if (key.endsWith('[]')) {
          var arrayKey = key.slice(0, -2);
          if (!arrays[arrayKey]) arrays[arrayKey] = [];
          arrays[arrayKey].push(value);
          return;
        }
        payload[key] = value;
      });
      Object.keys(arrays).forEach(function (k) {
        payload[k] = arrays[k];
      });
      return payload;
    }

    function showCf7Message(form, message, isError) {
      var output = form.querySelector('.wpcf7-response-output');
      if (!output) {
        output = document.createElement('div');
        output.className = 'wpcf7-response-output';
        form.appendChild(output);
      }
      var status = form.closest('.wpcf7') && form.closest('.wpcf7').querySelector('.screen-reader-response [role="status"]');
      var text = message || '';
      output.textContent = text;
      output.innerHTML = '';
      output.appendChild(document.createTextNode(text));
      output.setAttribute('aria-hidden', text ? 'false' : 'true');
      output.setAttribute('data-astro-message', text);
      output.classList.remove('wpcf7-validation-errors', 'wpcf7-mail-sent-ok', 'wpcf7-mail-sent-ng');
      if (text) {
        output.classList.add(isError ? 'wpcf7-mail-sent-ng' : 'wpcf7-mail-sent-ok');
        output.style.display = 'block';
        output.style.visibility = 'visible';
        output.style.opacity = '1';
        var darkForm = form.closest('.form-design') || form.querySelector('.form-design');
        if (darkForm) {
          output.style.color = '#ffffff';
          output.style.borderColor = '#ffffff';
          output.style.background = 'rgba(0,0,0,0.18)';
        } else {
          output.style.color = isError ? '#b42318' : '#0a7a3e';
          output.style.borderColor = isError ? '#b42318' : '#0a7a3e';
          output.style.background = isError ? '#fef3f2' : '#e8f8ef';
        }
      } else {
        output.style.display = 'none';
      }
      if (status) status.textContent = text;
      if (text) {
        try {
          output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {}
      }
      return output;
    }

    function clearFieldErrors(form) {
      form.querySelectorAll('.astro-field-error').forEach(function (el) {
        el.classList.remove('astro-field-error');
        el.removeAttribute('aria-invalid');
      });
      var tip = form.querySelector('.astro-experience-tip');
      if (tip) tip.remove();
    }

    function markFieldError(el) {
      if (!el) return;
      el.classList.add('astro-field-error');
      el.setAttribute('aria-invalid', 'true');
    }

    function showExperienceRequiredTip(form) {
      var wrap =
        form.querySelector('.wpcf7-form-control-wrap[data-name="experience"]') ||
        form.querySelector('.chek-box .wpcf7-form-control-wrap') ||
        form.querySelector('.chek-box');
      if (!wrap) return;
      var tip = form.querySelector('.astro-experience-tip');
      if (!tip) {
        tip = document.createElement('span');
        tip.className = 'astro-experience-tip wpcf7-not-valid-tip';
        tip.setAttribute('role', 'alert');
        tip.textContent = 'Please fill out this field.';
        wrap.appendChild(tip);
      } else {
        tip.textContent = 'Please fill out this field.';
        tip.hidden = false;
      }
    }

    function getFieldValue(form, names) {
      for (var i = 0; i < names.length; i++) {
        var el = form.querySelector('[name="' + names[i] + '"]');
        if (el && String(el.value || '').trim()) return String(el.value).trim();
      }
      return '';
    }

    /** CF7 often uses email-57 / email-123 instead of your-email. */
    function getEmailField(form) {
      return (
        form.querySelector('[name="your-email"]') ||
        form.querySelector('[name="email"]') ||
        form.querySelector('input[type="email"]') ||
        form.querySelector('input[name^="email-"]')
      );
    }

    function getEmailValue(form) {
      var named = getFieldValue(form, ['your-email', 'email']);
      if (named) return named;
      var el = getEmailField(form);
      return el && String(el.value || '').trim() ? String(el.value).trim() : '';
    }

    function getPhoneDigits(form) {
      var phone = form.querySelector('.wpcf7-phonetext, input.cg-phone-input, input[name^="phonetext"], input[name="phone"]');
      if (!phone) return '';
      var dialCode = '';
      if (window.jQuery) {
        try {
          var $phone = window.jQuery(phone);
          if ($phone.data('plugin_intlTelInput')) {
            var dial = $phone.intlTelInput('getSelectedCountryData');
            if (dial && dial.dialCode) dialCode = String(dial.dialCode);
          }
        } catch (e) {}
      }
      return normalizeNationalPhoneDigits(phone, dialCode);
    }

    function validateLegacyContactForm(form) {
      clearFieldErrors(form);
      var errors = [];
      var spamHit = false;
      var detailMessages = [];
      var NAME_RE = /^[\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)*$/u;

      var firstNameEl =
        form.querySelector('[name="f-name"]') ||
        form.querySelector('[name="your-fname"]') ||
        form.querySelector('[name="first_name"]');
      var lastNameEl =
        form.querySelector('[name="l-name"]') ||
        form.querySelector('[name="your-lname"]') ||
        form.querySelector('[name="last_name"]');
      var nameEl =
        form.querySelector('[name="full-name"]') ||
        form.querySelector('[name="your-name"]') ||
        form.querySelector('[name="name"]') ||
        firstNameEl;
      var firstName = getFieldValue(form, ['f-name', 'your-fname', 'first_name', 'firstName', 'fname']);
      var lastName = getFieldValue(form, ['l-name', 'your-lname', 'last_name', 'lastName', 'lname']);
      var fullName = getFieldValue(form, ['full-name', 'your-name', 'name', 'full_name']);
      var nameValue = fullName || [firstName, lastName].filter(Boolean).join(' ').trim();
      if (!nameValue) {
        markFieldError(nameEl);
        if (lastNameEl && !lastName) markFieldError(lastNameEl);
        errors.push('name');
        detailMessages.push('Full name is required.');
      } else if (fieldContainsLink(nameValue) || fieldContainsHtml(nameValue)) {
        spamHit = true;
        markFieldError(nameEl);
        errors.push('name');
      } else if (!NAME_RE.test(nameValue)) {
        markFieldError(nameEl);
        errors.push('name');
        detailMessages.push('Full name must contain only letters and spaces.');
      }

      var emailEl = getEmailField(form);
      var email = getEmailValue(form);
      if (!email) {
        markFieldError(emailEl);
        errors.push('email');
        detailMessages.push('Email is required.');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) || /\s/.test(email)) {
        markFieldError(emailEl);
        errors.push('email');
        detailMessages.push('Please enter a valid email address.');
      } else if (fieldContainsHtml(email) || /(^|\+)[^@]*https?/i.test(email)) {
        spamHit = true;
        markFieldError(emailEl);
        errors.push('email');
      }

      var phoneEl = form.querySelector('.wpcf7-phonetext, input.cg-phone-input, input[name^="phonetext"], input[name="phone"]');
      var phoneDigits = getPhoneDigits(form);
      if (!phoneDigits) {
        markFieldError(phoneEl);
        errors.push('phone');
        detailMessages.push('Phone number is required.');
      }

      var subjectEl = form.querySelector('[name="your-subject"]');
      if (subjectEl) {
        var subject = String(subjectEl.value || '').trim();
        if (!subject) {
          markFieldError(subjectEl);
          errors.push('subject');
        } else if (fieldContainsLink(subject) || fieldContainsHtml(subject)) {
          spamHit = true;
          markFieldError(subjectEl);
          errors.push('subject');
        }
      }

      var messageEl = form.querySelector('[name="your-message"]') || form.querySelector('[name="message"]');
      if (messageEl) {
        var message = String(messageEl.value || '').trim();
        if (!message) {
          markFieldError(messageEl);
          errors.push('message');
          detailMessages.push('Message is required.');
        } else if (fieldContainsLink(message) || fieldContainsHtml(message)) {
          spamHit = true;
          markFieldError(messageEl);
          errors.push('message');
        }
      } else {
        errors.push('message');
        detailMessages.push('Message is required.');
      }

      var companyEl =
        form.querySelector('[name="company-name"]') ||
        form.querySelector('[name="company_name"]') ||
        form.querySelector('[name="company"]') ||
        form.querySelector('[name="your-company"]');
      if (companyEl) {
        var company = String(companyEl.value || '').trim();
        if (!company) {
          markFieldError(companyEl);
          errors.push('company');
          detailMessages.push('Company name is required.');
        } else if (fieldContainsLink(company) || fieldContainsHtml(company)) {
          spamHit = true;
          markFieldError(companyEl);
          errors.push('company');
        }
      }

      // Reject links / HTML in other visible user text inputs (not tracking meta fields).
      form.querySelectorAll('input[type="text"], input[type="search"], textarea').forEach(function (el) {
        if (!el || el.disabled || el.readOnly) return;
        if (el.classList.contains('wpcf7-phonetext') || el.classList.contains('cg-phone-input')) return;
        if (isTrackingOrMetaField(el) || !isVisibleFormControl(el)) return;
        var val = String(el.value || '');
        if (!val.trim()) return;
        if (fieldContainsLink(val) || fieldContainsHtml(val)) {
          spamHit = true;
          markFieldError(el);
          if (errors.indexOf('spam') === -1) errors.push('spam');
        }
      });

      var experienceBoxes = form.querySelectorAll('input[name="experience[]"]');
      if (experienceBoxes.length) {
        var checked = form.querySelectorAll('input[name="experience[]"]:checked');
        if (!checked.length) {
          showExperienceRequiredTip(form);
          errors.push('experience');
        }
      }

      if (errors.length) {
        var onlyExperience = errors.length === 1 && errors[0] === 'experience';
        if (!onlyExperience) {
          var msg = spamHit
            ? 'Links and HTML are not allowed in form fields.'
            : detailMessages[0] || 'Please provide all required information.';
          showCf7Message(form, msg, true);
        } else {
          showCf7Message(form, '', false);
        }
        var firstError = form.querySelector('input.astro-field-error, textarea.astro-field-error');
        if (firstError && typeof firstError.focus === 'function') {
          try {
            firstError.focus();
          } catch (e) {}
        }
        return false;
      }
      return true;
    }

    function enforcePhoneDigitsOnly(form) {
      form.querySelectorAll('.wpcf7-phonetext, input.cg-phone-input, input[name^="phonetext"], input[name="phone"]').forEach(function (phone) {
        if (phone.dataset.astroDigitsOnly) return;
        phone.dataset.astroDigitsOnly = '1';
        phone.setAttribute('inputmode', 'numeric');
        phone.setAttribute('autocomplete', 'tel');
        if (phone.type === 'text') phone.type = 'tel';
        phone.removeAttribute('maxlength');
        phone.removeAttribute('minlength');

        function currentDialCode() {
          var dialCode = '';
          if (window.jQuery) {
            try {
              var $phone = window.jQuery(phone);
              if ($phone.data('plugin_intlTelInput')) {
                var dial = $phone.intlTelInput('getSelectedCountryData');
                if (dial && dial.dialCode) dialCode = String(dial.dialCode);
              }
            } catch (e) {}
          }
          return dialCode;
        }

        function sanitizePhoneInput() {
          var cleaned = normalizeNationalPhoneDigits(phone, currentDialCode());
          if (phone.value !== cleaned) phone.value = cleaned;
        }

        phone.addEventListener('input', sanitizePhoneInput);
        phone.addEventListener('keyup', sanitizePhoneInput);
        phone.addEventListener('keypress', function (event) {
          if (event.ctrlKey || event.metaKey || event.altKey || !event.key) return;
          if (event.key.length === 1 && !/\d/.test(event.key)) {
            event.preventDefault();
          }
        });
        phone.addEventListener('paste', function (event) {
          var text = (event.clipboardData || window.clipboardData).getData('text') || '';
          event.preventDefault();
          text = text.replace(/\D/g, '');
          var start = phone.selectionStart || 0;
          var end = phone.selectionEnd || 0;
          phone.value =
            String(phone.value || '').slice(0, start) + text + String(phone.value || '').slice(end);
          sanitizePhoneInput();
        });
      });
    }

    function enforceNameLettersOnly(form) {
      form
        .querySelectorAll(
          'input[name="full-name"], input[name="your-name"], input[name="name"], input[name="full_name"], input[name="f-name"], input[name="l-name"], input[name="your-fname"], input[name="your-lname"], input[name="first_name"], input[name="last_name"]',
        )
        .forEach(function (nameInput) {
          if (nameInput.dataset.astroLettersOnly) return;
          nameInput.dataset.astroLettersOnly = '1';
          nameInput.setAttribute('autocomplete', nameInput.getAttribute('autocomplete') || 'name');

          function sanitizeNameInput() {
            var cleaned = String(nameInput.value || '')
              .replace(/[^\p{L}\p{M}\s]/gu, '')
              .replace(/\s{2,}/g, ' ');
            if (nameInput.value !== cleaned) nameInput.value = cleaned;
          }

          nameInput.addEventListener('input', sanitizeNameInput);
          nameInput.addEventListener('paste', function (event) {
            event.preventDefault();
            var text = (event.clipboardData || window.clipboardData).getData('text') || '';
            text = text.replace(/[^\p{L}\p{M}\s]/gu, '').replace(/\s{2,}/g, ' ');
            var start = nameInput.selectionStart || 0;
            var end = nameInput.selectionEnd || 0;
            nameInput.value =
              String(nameInput.value || '').slice(0, start) +
              text +
              String(nameInput.value || '').slice(end);
            sanitizeNameInput();
          });
        });
    }

    function clearLegacyFormFields(form) {
      form.querySelectorAll('input, textarea, select').forEach(function (el) {
        var type = (el.type || '').toLowerCase();
        if (type === 'hidden' || type === 'submit' || type === 'button') return;
        if (type === 'checkbox' || type === 'radio') {
          el.checked = false;
          return;
        }
        el.value = '';
      });
    }

    function setSubmitting(form, submitting) {
      var btn = form.querySelector('button[type="submit"], button#submit, input[type="submit"]');
      if (btn) btn.disabled = submitting;
      form.classList.toggle('submitting', submitting);
    }

    function submitLegacyContactForm(form) {
      if (form.__astroSubmitting) return;
      enforcePhoneDigitsOnly(form);
      enforceNameLettersOnly(form);
      captureTrackingFields(form);
      syncPhoneNumbers(form);

      if (!validateLegacyContactForm(form)) return;

      ensureHiddenField(form, 'submitted_at', new Date().toISOString());
      form.__astroSubmitting = true;
      setSubmitting(form, true);
      showCf7Message(form, 'Sending…', false);

      fetch('/api/contact/', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(buildContactFormPayload(form)),
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data && result.data.success) {
            var successMsg =
              (result.data && result.data.message) || 'Thank you. Your enquiry has been received.';
            // Avoid form.reset() — CF7 clears .wpcf7-response-output on reset.
            clearLegacyFormFields(form);
            clearFieldErrors(form);
            form.dataset.submissionId =
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
            captureTrackingFields(form);
            showCf7Message(form, successMsg, false);
            if (typeof window.ensurePhoneCountryFields === 'function') {
              window.__astroPhoneCountryApplied = false;
            }
            setTimeout(function () {
              safe(ensurePhoneCountryFields);
              enforcePhoneDigitsOnly(form);
              enforceNameLettersOnly(form);
              showCf7Message(form, successMsg, false);
            }, 100);
            setTimeout(function () {
              showCf7Message(form, successMsg, false);
            }, 300);
            return;
          }
          showCf7Message(
            form,
            (result.data && result.data.message) ||
              'We could not submit your enquiry at the moment. Please try again shortly.',
            true,
          );
        })
        .catch(function () {
          showCf7Message(
            form,
            'We could not submit your enquiry at the moment. Please try again shortly.',
            true,
          );
        })
        .finally(function () {
          form.__astroSubmitting = false;
          setSubmitting(form, false);
        });
    }

    document.addEventListener(
      'submit',
      function (event) {
        var form = event.target;
        if (!form || !form.classList || !form.classList.contains('wpcf7-form')) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        submitLegacyContactForm(form);
      },
      true,
    );

    document.querySelectorAll('form.wpcf7-form').forEach(function (form) {
      ensureLegacyTrackingFields(form);
      captureTrackingFields(form);
      enforcePhoneDigitsOnly(form);
      enforceNameLettersOnly(form);
      // Ensure message is marked required in the DOM (some CF7 dumps omit the class).
      form.querySelectorAll('[name="your-message"], [name="message"]').forEach(function (el) {
        el.setAttribute('aria-required', 'true');
        el.classList.add('wpcf7-validates-as-required');
      });
      form.querySelectorAll('[name="company-name"], [name="company"], [name="company_name"], [name="your-company"]').forEach(function (el) {
        el.setAttribute('aria-required', 'true');
        el.classList.add('wpcf7-validates-as-required');
      });
    });
  }

  /**
   * Soft-clamp sticky sidebar cards so they clear the header and don't cover the footer.
   * Skip `.elementor-element-f006bfc` — that CRS post sidebar uses CSS `position:sticky`
   * (see injectMirrorCss). jQuery Elementor sticky + clamp was setting top:-400px.
   */
  function getStickyHeaderClearance() {
    var header =
      document.querySelector('.elementor-element-6f7aa16.elementor-sticky--active') ||
      document.querySelector('.elementor-location-header .elementor-sticky--active') ||
      document.querySelector('.elementor-element-6f7aa16');
    var h = header ? header.getBoundingClientRect().height : 81;
    if (!h || h < 40) h = 81;
    return Math.max(100, Math.ceil(h) + 20);
  }

  function ensureStickySidebarClamp() {
    var footer = document.querySelector('.elementor-location-footer');
    var headerClearance = getStickyHeaderClearance();
    var nodes = document.querySelectorAll(
      '.elementor-element-16a1fb7, .elementor-element-0933e6e, .blog-form',
    );
    nodes.forEach(function (el) {
      if (!el.classList.contains('elementor-sticky--active')) {
        if (el.dataset.astroStickyClamp) {
          el.style.removeProperty('top');
          delete el.dataset.astroStickyClamp;
        }
        return;
      }
      var cs = window.getComputedStyle(el);
      if (cs.position !== 'fixed') {
        if (el.dataset.astroStickyClamp) {
          el.style.removeProperty('top');
          delete el.dataset.astroStickyClamp;
        }
        return;
      }

      var settings = {};
      try {
        settings = JSON.parse(
          (el.getAttribute('data-settings') || '{}')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&'),
        );
      } catch (e) {
        settings = {};
      }
      var configured = Number(settings.sticky_offset);
      if (!isFinite(configured)) configured = 70;
      var baseTop = Math.max(headerClearance, configured);

      var rect = el.getBoundingClientRect();
      var height = rect.height;
      if (!height) return;

      var limit = Infinity;
      var col = el.closest('.elementor-column');
      // Prefer parent section that is NOT the sticky element itself
      var section = el.parentElement
        ? el.parentElement.closest('.elementor-top-section, .elementor-section')
        : null;
      if (col) limit = Math.min(limit, col.getBoundingClientRect().bottom);
      if (section && section !== el) limit = Math.min(limit, section.getBoundingClientRect().bottom);
      if (footer) limit = Math.min(limit, footer.getBoundingClientRect().top);

      var gap = 16;
      var desiredTop = baseTop;
      if (isFinite(limit) && baseTop + height > limit - gap) {
        desiredTop = Math.round(limit - gap - height);
      }
      // Never park the card fully above the viewport
      if (desiredTop < 0) desiredTop = Math.max(8, Math.min(baseTop, desiredTop + height * 0.15));

      var next = desiredTop + 'px';
      if (
        el.style.getPropertyValue('top') !== next ||
        el.style.getPropertyPriority('top') !== 'important'
      ) {
        el.style.setProperty('top', next, 'important');
      }
      el.dataset.astroStickyClamp = '1';
    });
  }

  var stickyClampQueued = false;
  function queueStickySidebarClamp() {
    if (stickyClampQueued) return;
    stickyClampQueued = true;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        stickyClampQueued = false;
        safe(ensureStickySidebarClamp);
      });
    });
  }

  function bindStickySidebarClampObservers() {
    document
      .querySelectorAll('.elementor-element-16a1fb7, .elementor-element-0933e6e, .blog-form')
      .forEach(function (el) {
        if (el.dataset.astroStickyObs) return;
        el.dataset.astroStickyObs = '1';
        var mo = new MutationObserver(queueStickySidebarClamp);
        mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
      });
  }

  /** Prefer CSS sticky for single-post sidebar forms (Elementor sticky often never boots). */
  function preferCssStickyPostForm() {
    document
      .querySelectorAll('.elementor-element-f006bfc, .elementor-element-3595752')
      .forEach(function (el) {
        if (el.dataset.astroCssSticky) return;
        el.dataset.astroCssSticky = '1';
        // Strip Elementor sticky flags so jquery.sticky does not force position:fixed
        var raw = el.getAttribute('data-settings') || '';
        if (raw && /sticky/.test(raw)) {
          try {
            var settings = JSON.parse(
              raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
            );
            delete settings.sticky;
            delete settings.sticky_on;
            delete settings.sticky_parent;
            delete settings.sticky_offset;
            el.setAttribute('data-settings', JSON.stringify(settings));
          } catch (e) {
            /* keep original */
          }
        }
        el.classList.remove('elementor-sticky', 'elementor-sticky--active', 'elementor-sticky--effects');
        el.style.removeProperty('top');
        el.style.removeProperty('position');
        el.style.removeProperty('width');
        el.style.removeProperty('left');
      });

    // Fixed-position fallback when CSS sticky cannot engage
    if (window.__astroPostFormStickyBound) return;
    window.__astroPostFormStickyBound = true;
    var el =
      document.querySelector('.elementor-element-f006bfc') ||
      document.querySelector('.elementor-element-3595752');
    if (!el) return;
    var col = el.closest('.elementor-column');
    if (!col) return;
    var spacer = null;
    var OFFSET = 100;

    function clearPin() {
      el.style.removeProperty('position');
      el.style.removeProperty('top');
      el.style.removeProperty('left');
      el.style.removeProperty('width');
      el.style.removeProperty('z-index');
      if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer);
      spacer = null;
    }

    function ensureSpacer() {
      if (spacer) return;
      spacer = document.createElement('div');
      spacer.setAttribute('data-astro-sticky-spacer', '1');
      spacer.style.height = el.offsetHeight + 'px';
      spacer.style.width = '100%';
      if (el.parentNode) el.parentNode.insertBefore(spacer, el);
    }

    function onScroll() {
      if (window.innerWidth < 768) {
        clearPin();
        return;
      }

      if (!el.dataset.astroStickyNatural) {
        // Measure while unpinned
        if (spacer) clearPin();
        el.dataset.astroStickyNatural = String(el.getBoundingClientRect().top + window.scrollY);
      }

      var natural = Number(el.dataset.astroStickyNatural);
      var elH = el.offsetHeight;
      var colRect = col.getBoundingClientRect();
      var y = window.scrollY;
      var stickStart = natural - OFFSET;
      var stickEnd = colRect.bottom + y - elH - OFFSET;

      // Prefer native CSS sticky when it holds near OFFSET
      var cs = window.getComputedStyle(el);
      if (cs.position === 'sticky' && !spacer) {
        var topNow = el.getBoundingClientRect().top;
        if (y >= stickStart && topNow <= OFFSET + 14 && topNow >= OFFSET - 14) {
          return;
        }
        // If still scrolling away past stickStart, CSS sticky failed — use fixed
        if (y < stickStart) return;
      } else if (y < stickStart) {
        clearPin();
        return;
      }

      ensureSpacer();
      var width = colRect.width;
      var left = colRect.left;
      if (y >= stickEnd) {
        el.style.position = 'fixed';
        el.style.top = Math.max(8, colRect.bottom - elH) + 'px';
        el.style.left = left + 'px';
        el.style.width = width + 'px';
        el.style.zIndex = '10';
      } else {
        el.style.position = 'fixed';
        el.style.top = OFFSET + 'px';
        el.style.left = left + 'px';
        el.style.width = width + 'px';
        el.style.zIndex = '10';
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      delete el.dataset.astroStickyNatural;
      clearPin();
      onScroll();
    });
    setTimeout(onScroll, 50);
    setTimeout(onScroll, 500);
  }

  /** Latest Blogs: category filters + client-side Load More (10 posts per batch). */
  function ensureBlogCategoryFilters() {
    var buttons = document.querySelectorAll('.catbutton .filter-button, .filter-button[data-filter]');
    var posts = Array.prototype.slice.call(
      document.querySelectorAll('.filter-post .filter, .filter-post .main-post.post-wrap'),
    );
    if (!buttons.length || !posts.length) return;

    var BATCH = 10;
    var activeFilter = 'all';
    var visibleLimit = BATCH;
    var BLOG_CARD_FALLBACK_IMAGE = '/wp-content/uploads/2024/02/Contact-banner.png';
    var loadMoreBtn =
      document.querySelector('[data-astro-blog-load-more]') ||
      document.querySelector('.astro-blog-load-more');

    function getNoscriptFallbackSrc(img) {
      var sibling = img.nextElementSibling;
      if (!sibling || sibling.tagName !== 'NOSCRIPT') return '';
      var html = sibling.textContent || sibling.innerHTML || '';
      var match = html.match(/<img[^>]*\ssrc=['"]([^'"]+)['"]/i);
      return match ? String(match[1]).trim() : '';
    }

    function hydratePostImages(post) {
      post.querySelectorAll('img').forEach(function (img) {
        var preferred =
          img.getAttribute('src') ||
          img.getAttribute('data-lazy-src') ||
          img.getAttribute('data-src') ||
          getNoscriptFallbackSrc(img);
        var lazySrc = img.getAttribute('data-lazy-src') || img.getAttribute('data-src');
        var fallback = lazySrc || getNoscriptFallbackSrc(img);

        if (!preferred || preferred.indexOf('data:image') === 0) {
          preferred = fallback;
        }
        if (!preferred && post.matches('.main-post.post-wrap')) {
          preferred = BLOG_CARD_FALLBACK_IMAGE;
        }
        if (preferred && (img.getAttribute('src') || '').indexOf('data:image') === 0) {
          img.setAttribute('src', preferred);
        } else if (preferred && !img.getAttribute('src')) {
          img.setAttribute('src', preferred);
        }

        var lazySrcset = img.getAttribute('data-lazy-srcset') || img.getAttribute('data-srcset');
        if (lazySrcset && !img.getAttribute('srcset')) {
          img.setAttribute('srcset', lazySrcset);
        }
        var lazySizes = img.getAttribute('data-lazy-sizes');
        if (lazySizes && !img.getAttribute('sizes')) {
          img.setAttribute('sizes', lazySizes);
        }

        if (img.dataset.astroPostImgRecover !== '1') {
          img.dataset.astroPostImgRecover = '1';
          img.addEventListener(
            'error',
            function () {
              var rescue =
                getNoscriptFallbackSrc(img) ||
                img.getAttribute('data-lazy-src') ||
                (post.matches('.main-post.post-wrap') ? BLOG_CARD_FALLBACK_IMAGE : '');
              if (!rescue || img.getAttribute('src') === rescue) return;
              img.setAttribute('src', rescue);
            },
            { once: true },
          );
        }

        if (!img.loading) img.loading = 'lazy';
      });
    }

    function ensureLoadMoreButton() {
      var wrap = document.querySelector('.astro-blog-load-more-wrap');
      if (!loadMoreBtn && !wrap) {
        var filterPost = document.querySelector('.filter-post');
        if (!filterPost) return null;
        wrap = document.createElement('div');
        wrap.className = 'astro-blog-load-more-wrap';
        wrap.innerHTML =
          '<button type="button" class="astro-blog-load-more btn btn-default" data-astro-blog-load-more>Load More</button>';
        filterPost.insertAdjacentElement('afterend', wrap);
      }
      if (!loadMoreBtn) {
        loadMoreBtn = document.querySelector('[data-astro-blog-load-more], .astro-blog-load-more');
      }
      if (loadMoreBtn && loadMoreBtn.dataset.astroLoadMoreBound !== '1') {
        loadMoreBtn.dataset.astroLoadMoreBound = '1';
        loadMoreBtn.addEventListener('click', function (e) {
          e.preventDefault();
          visibleLimit += BATCH;
          applyFilter(activeFilter);
        });
      }
      return loadMoreBtn;
    }

    function matchingPosts() {
      var slug = String(activeFilter || 'all').toLowerCase();
      var isAll = !slug || slug === 'all';
      return posts.filter(function (post) {
        return isAll || post.classList.contains(slug);
      });
    }

    function applyFilter(value) {
      activeFilter = String(value || 'all').toLowerCase();
      var slug = activeFilter;
      var isAll = !slug || slug === 'all';
      var matched = matchingPosts();

      posts.forEach(function (post) {
        var match = isAll || post.classList.contains(slug);
        post.classList.toggle('is-hidden', !match);
        if (!match) {
          post.classList.add('is-load-hidden');
          post.style.display = 'none';
        }
      });

      matched.forEach(function (post, index) {
        var show = index < visibleLimit;
        post.classList.toggle('is-load-hidden', !show);
        post.style.display = show ? '' : 'none';
        if (show) hydratePostImages(post);
      });

      buttons.forEach(function (btn) {
        var active =
          String(btn.getAttribute('data-filter') || '').toLowerCase() === slug ||
          (isAll && String(btn.getAttribute('data-filter') || '').toLowerCase() === 'all');
        btn.classList.toggle('active', active);
        btn.classList.toggle('is-active', active);
      });

      var btn = ensureLoadMoreButton();
      if (btn) {
        var hasMore = matched.length > visibleLimit;
        btn.classList.toggle('is-hidden', !hasMore);
        btn.style.display = hasMore ? '' : 'none';
      }
    }

    buttons.forEach(function (btn) {
      if (btn.dataset.astroFilterBound === '1') return;
      btn.dataset.astroFilterBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        visibleLimit = BATCH;
        applyFilter(btn.getAttribute('data-filter') || 'all');
      });
    });

    visibleLimit = BATCH;
    applyFilter('all');
  }

  /** Recruitment page hero title: force two-line desktop wrap. */
  function ensureRecruitmentTwoLineTitle() {
    if (!document.body || !(document.body.classList.contains('page-id-1750') || document.body.classList.contains('elementor-page-1750'))) return;
    var title = document.querySelector('.elementor-element-287c2a2f .elementor-heading-title');
    if (!title || title.dataset.astroTwoLine === '1') return;
    title.innerHTML =
      '<span class="astro-recruitment-line1">How Our Expert <span class="blue">Emiratisation Recruitment</span></span>' +
      '<span class="astro-recruitment-line2">Services Can Help You</span>';
    title.dataset.astroTwoLine = '1';
  }

  function boot() {
    safe(injectMirrorCss);
    safe(ensureIconAndSwiperCss);
    safe(ensureFormFixCss);
    safe(preferCssStickyPostForm);
    safe(wireLegacyContactForms);
    safe(unwrapRocketLazyScripts);
    safe(ensureSwiperGlobal);
    safe(prepareTestimonialCarousels);
    safe(ensureLazyImages);
    safe(fixResponsiveImages);
    safe(animateCounters);
    safe(ensureBackgroundVideos);
    safe(ensureElementorVideos);
    safe(ensureLottieIcons);
    safe(ensureTestimonialSwiper);
    safe(ensureNestedCarousels);
    safe(ensureImageCarousels);
    safe(ensureLoopCarousel);
    safe(ensureHaCarousel);
    safe(ensureClassicAccordion);
    safe(ensureBootstrapCollapseAccordions);
    safe(ensureNestedAccordion);
    safe(ensureBlogCategoryFilters);
    safe(ensureRecruitmentTwoLineTitle);
    safe(decodeCloudflareEmails);
    safe(ensureShareButtons);
    safe(ensurePixfortAnimations);
    safe(ensureClassicTabs);
    safe(ensureNestedTabs);
    safe(ensureTaxonomyFilter);
    safe(ensureStretchedSections);
    safe(ensureScrollsequence);
    safe(ensureNavMenus);
    safe(ensureKinzaFormSkin);
    safe(ensureStickySidebarClamp);
    safe(bindStickySidebarClampObservers);
    if (!window.__astroStickyClampBound) {
      window.__astroStickyClampBound = true;
      window.addEventListener('scroll', queueStickySidebarClamp, { passive: true });
      window.addEventListener('resize', queueStickySidebarClamp);
    }
    // Wait for jQuery + nbcpf plugins (deferred) before fixing phone fields
    setTimeout(function () {
      safe(ensurePhoneCountryFields);
      safe(ensureNavMenus);
      safe(preferCssStickyPostForm);
      safe(ensureHaCarousel);
      safe(ensureKinzaFormSkin);
      safe(ensureTaxonomyFilter);
      safe(ensureBlogCategoryFilters);
      safe(ensureRecruitmentTwoLineTitle);
      safe(ensureStickySidebarClamp);
      safe(bindStickySidebarClampObservers);
    }, 600);
    setTimeout(function () {
      safe(unwrapRocketLazyScripts);
      safe(nudgeElementor);
      safe(ensureLazyImages);
    safe(fixResponsiveImages);
      safe(animateCounters);
      safe(ensureBackgroundVideos);
      safe(ensureElementorVideos);
      safe(ensureLottieIcons);
      safe(ensureTestimonialSwiper);
      safe(ensureNestedCarousels);
      safe(ensureImageCarousels);
      safe(ensureLoopCarousel);
      safe(ensureHaCarousel);
      safe(ensureClassicAccordion);
    safe(ensureBootstrapCollapseAccordions);
    safe(ensureNestedAccordion);
    safe(ensureBlogCategoryFilters);
    safe(ensureRecruitmentTwoLineTitle);
    safe(decodeCloudflareEmails);
    safe(ensureShareButtons);
      safe(ensurePixfortAnimations);
      safe(ensureClassicTabs);
      safe(ensureNestedTabs);
      safe(ensureTaxonomyFilter);
      safe(ensureStretchedSections);
      safe(ensureScrollsequence);
      safe(ensurePhoneCountryFields);
      safe(ensureNavMenus);
      safe(preferCssStickyPostForm);
      safe(ensureKinzaFormSkin);
      safe(ensureStickySidebarClamp);
      safe(bindStickySidebarClampObservers);
      safe(forceUninitCarousels);
    }, 1200);
    // Swiper / Elementor modules often finish later than DOMContentLoaded
    setTimeout(function () {
      safe(ensureNestedCarousels);
      safe(ensureImageCarousels);
      safe(ensureLoopCarousel);
      safe(ensureHaCarousel);
      safe(ensureElementorVideos);
      safe(ensureTestimonialSwiper);
      safe(ensureLazyImages);
    safe(fixResponsiveImages);
      safe(ensureClassicAccordion);
    safe(ensureBootstrapCollapseAccordions);
    safe(ensureNestedAccordion);
    safe(decodeCloudflareEmails);
    safe(ensureShareButtons);
      safe(ensurePixfortAnimations);
      safe(ensureTaxonomyFilter);
      safe(ensureStretchedSections);
      safe(ensureScrollsequence);
      safe(ensurePhoneCountryFields);
      safe(ensureNavMenus);
      safe(ensureKinzaFormSkin);
      safe(ensureStickySidebarClamp);
      safe(bindStickySidebarClampObservers);
      safe(forceUninitCarousels);
    }, 2500);
    setTimeout(function () {
      safe(forceUninitCarousels);
      safe(ensurePhoneCountryFields);
    }, 4000);
  }

  /** Ensure Emiratisation Hub form/menu CSS is present on every page (incl. homepage). */
  function ensureFormFixCss() {
    if (document.querySelector('link[href*="form-fix.css"]') || document.getElementById('astro-form-fix-css')) {
      return;
    }
    var link = document.createElement('link');
    link.id = 'astro-form-fix-css';
    link.rel = 'stylesheet';
    link.href = '/css/form-fix.css?v=20260808';
    document.head.appendChild(link);
  }

  /**
   * Footer contact form uses `.n-footer` styles (white inputs, 12px radius).
   * Do NOT add `.kzform` — that class is for blog/contact card skins and
   * `.c2-contact .kzform` would override the footer look.
   */
  function ensureKinzaFormSkin() {
    // Strip accidental kzform on footer forms (older mirror-fixes / markup)
    document.querySelectorAll('.n-footer.kzform, .n-footer .kzform, .n-footer form.kzform').forEach(function (el) {
      el.classList.remove('kzform');
    });
    // Align First/Last name row (CSS columns stagger → grid)
    if (!document.getElementById('kinza-form-fix-css')) {
      var formCss = document.createElement('link');
      formCss.id = 'kinza-form-fix-css';
      formCss.rel = 'stylesheet';
      formCss.href = '/css/kinza-form-fix.css?v=20260804-contact3';
      document.head.appendChild(formCss);
    }
    // Inter is referenced by .n-footer form CSS; load if missing
    var hasInter = false;
    try {
      hasInter = !!(document.fonts && document.fonts.check && document.fonts.check('16px Inter'));
    } catch (e) {
      hasInter = false;
    }
    if (!hasInter && !document.getElementById('kinza-inter-font')) {
      var link = document.createElement('link');
      link.id = 'kinza-inter-font';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
  }

  /** Force Swiper fallbacks when Elementor left carousels uninitialized. */
  function forceUninitCarousels() {
    document
      .querySelectorAll(
        '.elementor-widget-image-carousel .swiper:not(.swiper-initialized), .elementor-widget-n-carousel .swiper:not(.swiper-initialized), .elementor-widget-loop-carousel .swiper:not(.swiper-initialized), .elementor-widget-testimonial-carousel .swiper:not(.swiper-initialized)',
      )
      .forEach(function (wrap) {
        var widget = wrap.closest(
          '.elementor-widget-image-carousel, .elementor-widget-n-carousel, .elementor-widget-loop-carousel, .elementor-widget-testimonial-carousel',
        );
        if (!widget) return;
        delete widget.dataset.astroImageCarousel;
        delete widget.dataset.astroCarousel;
        delete widget.dataset.astroLoopCarousel;
        delete widget.dataset.astroTestimonial;
      });
    safe(ensureImageCarousels);
    safe(ensureNestedCarousels);
    safe(ensureLoopCarousel);
    safe(ensureTestimonialSwiper);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // If any Rocket leftovers fire later, re-run widget fallbacks
  window.addEventListener('rocket-allScriptsLoaded', function () {
    safe(ensureNestedCarousels);
    safe(ensureImageCarousels);
    safe(ensureLoopCarousel);
    safe(ensureHaCarousel);
    safe(ensureElementorVideos);
    safe(ensureTestimonialSwiper);
    safe(ensureLazyImages);
    safe(fixResponsiveImages);
    safe(ensureClassicAccordion);
    safe(ensureBootstrapCollapseAccordions);
    safe(ensureNestedAccordion);
    safe(decodeCloudflareEmails);
    safe(ensureShareButtons);
    safe(ensurePixfortAnimations);
    safe(ensureTaxonomyFilter);
    safe(ensureStretchedSections);
    safe(ensureScrollsequence);
    safe(ensurePhoneCountryFields);
    safe(ensureNavMenus);
  });
})();
