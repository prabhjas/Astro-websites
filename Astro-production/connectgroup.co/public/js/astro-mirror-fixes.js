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

  /** WP Rocket leaves type="text/rocketlazyloadscript" on inline config — run it */
  function unwrapRocketLazyScripts() {
    document.querySelectorAll('script[type="text/rocketlazyloadscript"]').forEach(function (script) {
      var src = script.getAttribute('data-rocket-src');
      if (src && !script.getAttribute('src')) {
        script.setAttribute('src', src);
        script.removeAttribute('data-rocket-src');
      } else if (!src && script.textContent && script.textContent.trim()) {
        var replacement = document.createElement('script');
        if (script.className) replacement.className = script.className;
        if (script.id) replacement.id = script.id;
        replacement.textContent = script.textContent;
        script.parentNode.replaceChild(replacement, script);
      }
      script.removeAttribute('type');
    });
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
    if (typeof Swiper === 'undefined') return;

    document.querySelectorAll('.elementor-widget-testimonial-carousel').forEach(function (widget) {
      var wrap = widget.querySelector('.elementor-main-swiper.swiper, .swiper');
      if (!wrap) return;

      if (widget.dataset.astroTestimonial === '1' && wrap.swiper) return;

      if (wrap.swiper && typeof wrap.swiper.destroy === 'function') {
        wrap.swiper.destroy(true, true);
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
      var loop = slideCount > desktop;
      var paginationEl = widget.querySelector('.swiper-pagination');
      var swiperOptions = {
        slidesPerView: mobile,
        spaceBetween: gapMobile,
        loop: loop,
        watchOverflow: true,
        observer: true,
        observeParents: true,
        allowTouchMove: true,
        pagination: paginationEl ? { el: paginationEl, clickable: true } : undefined,
        breakpoints: {
          768: { slidesPerView: tablet, spaceBetween: gapTablet },
          1025: { slidesPerView: desktop, spaceBetween: gapDesktop },
        },
      };

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
    if (typeof Swiper === 'undefined') return;

    document.querySelectorAll('.elementor-widget-n-carousel').forEach(function (widget) {
      if (widget.dataset.astroCarousel) return;
      var wrap = widget.querySelector('.e-n-carousel.swiper');
      if (!wrap || wrap.swiper) {
        widget.dataset.astroCarousel = '1';
        return;
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

  /** Elementor image carousel (client logo marquee on subsidiary pages) */
  function ensureImageCarousels() {
    if (typeof Swiper === 'undefined') return;

    document.querySelectorAll('.elementor-widget-image-carousel').forEach(function (widget) {
      var wrap = widget.querySelector('.elementor-image-carousel-wrapper.swiper');
      if (!wrap) return;

      if (widget.dataset.astroImageCarousel === '1' && wrap.swiper) return;

      if (wrap.swiper && typeof wrap.swiper.destroy === 'function') {
        wrap.swiper.destroy(true, true);
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
      var slideCount = wrap.querySelectorAll('.swiper-slide').length;
      var loop = settings.infinite === 'yes' && slideCount > desktop;
      var slidesToScroll = parseInt(settings.slides_to_scroll || '1', 10) || 1;
      var nextEl = widget.querySelector('.elementor-swiper-button-next, .swiper-button-next');
      var prevEl = widget.querySelector('.elementor-swiper-button-prev, .swiper-button-prev');
      var swiperOptions = {
        slidesPerView: mobile,
        slidesPerGroup: slidesToScroll,
        spaceBetween: gapMobile,
        loop: loop,
        speed: parseInt(settings.speed || '500', 10) || 500,
        watchOverflow: true,
        observer: true,
        observeParents: true,
        allowTouchMove: true,
        breakpoints: {
          768: { slidesPerView: tablet, spaceBetween: gapTablet, slidesPerGroup: slidesToScroll },
          1025: { slidesPerView: desktop, spaceBetween: gapDesktop, slidesPerGroup: slidesToScroll },
        },
      };

      if (settings.navigation && settings.navigation !== 'none' && (nextEl || prevEl)) {
        swiperOptions.navigation = {
          nextEl: nextEl || undefined,
          prevEl: prevEl || undefined,
        };
      }

      if (settings.autoplay === 'yes') {
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

  /** WP Rocket / Elementor lazy images: promote data-lazy-src to real src */
  function ensureLazyImages() {
    document.querySelectorAll('img[data-lazy-src]').forEach(function (img) {
      var lazySrc = img.getAttribute('data-lazy-src');
      if (!lazySrc) return;
      var current = img.getAttribute('src') || '';
      if (!current || current.indexOf('data:image') === 0 || current !== lazySrc) {
        img.setAttribute('src', lazySrc);
      }
      var lazySrcset = img.getAttribute('data-lazy-srcset');
      if (lazySrcset && !img.getAttribute('srcset')) {
        img.setAttribute('srcset', lazySrcset);
      }
      var lazySizes = img.getAttribute('data-lazy-sizes');
      if (lazySizes && !img.getAttribute('sizes')) {
        img.setAttribute('sizes', lazySizes);
      }
      img.removeAttribute('data-lazy-src');
      img.removeAttribute('data-lazy-srcset');
      img.removeAttribute('data-lazy-sizes');
    });
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
  function ensureNestedAccordion() {
    var DURATION = 360;

    function panelOf(item) {
      return item.querySelector(':scope > .e-con') || item.querySelector('.e-con');
    }

    function animateOpen(item) {
      var panel = panelOf(item);
      if (!panel) {
        item.setAttribute('open', '');
        return;
      }
      if (item.dataset.astroAnimating === '1') return;
      item.dataset.astroAnimating = '1';
      item.setAttribute('open', '');
      panel.style.overflow = 'hidden';
      panel.style.height = '0px';
      panel.style.opacity = '0';
      panel.offsetHeight;
      panel.style.transition =
        'height ' + DURATION + 'ms ease, opacity ' + DURATION + 'ms ease';
      panel.style.height = panel.scrollHeight + 'px';
      panel.style.opacity = '1';
      window.setTimeout(function () {
        panel.style.height = '';
        panel.style.overflow = '';
        panel.style.transition = '';
        panel.style.opacity = '';
        delete item.dataset.astroAnimating;
      }, DURATION + 30);
    }

    function animateClose(item) {
      var panel = panelOf(item);
      if (!panel) {
        item.removeAttribute('open');
        return;
      }
      if (item.dataset.astroAnimating === '1') return;
      item.dataset.astroAnimating = '1';
      panel.style.overflow = 'hidden';
      panel.style.height = panel.scrollHeight + 'px';
      panel.style.opacity = '1';
      panel.offsetHeight;
      panel.style.transition =
        'height ' + DURATION + 'ms ease, opacity ' + DURATION + 'ms ease';
      panel.style.height = '0px';
      panel.style.opacity = '0';
      window.setTimeout(function () {
        item.removeAttribute('open');
        panel.style.height = '';
        panel.style.overflow = '';
        panel.style.transition = '';
        panel.style.opacity = '';
        delete item.dataset.astroAnimating;
      }, DURATION + 30);
    }

    document.querySelectorAll('.elementor-widget-n-accordion .e-n-accordion').forEach(function (root) {
      if (root.dataset.astroNestedAccordion) return;
      root.dataset.astroNestedAccordion = '1';

      root.querySelectorAll('.e-n-accordion-item').forEach(function (item) {
        var summary = item.querySelector('.e-n-accordion-item-title');
        if (!summary || summary.dataset.astroBound) return;
        summary.dataset.astroBound = '1';
        summary.addEventListener('click', function (e) {
          e.preventDefault();
          var willOpen = !item.hasAttribute('open');
          root.querySelectorAll('.e-n-accordion-item[open]').forEach(function (openItem) {
            if (openItem !== item) animateClose(openItem);
          });
          if (willOpen) animateOpen(item);
          else animateClose(item);
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
      var email = span ? decode(span.getAttribute('data-cfemail') || '') : 'contact@connectgroup.co';
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

  /** Classic Elementor accordion (FAQ) — smooth height animation */
  function ensureClassicAccordion() {
    var DURATION = 360;

    function getContent(title) {
      var contentId = title.getAttribute('aria-controls');
      return contentId ? document.getElementById(contentId) : null;
    }

    function animateOpen(title) {
      var content = getContent(title);
      title.classList.add('elementor-active');
      title.setAttribute('aria-expanded', 'true');
      if (!content) return;
      content.classList.add('elementor-active');
      content.hidden = false;
      content.style.removeProperty('display');
      content.style.display = 'block';
      content.style.overflow = 'hidden';
      content.style.height = '0px';
      content.style.opacity = '0';
      content.offsetHeight;
      content.style.transition =
        'height ' + DURATION + 'ms ease, opacity ' + DURATION + 'ms ease';
      content.style.height = content.scrollHeight + 'px';
      content.style.opacity = '1';
      window.setTimeout(function () {
        content.style.height = '';
        content.style.overflow = '';
        content.style.transition = '';
        content.style.opacity = '';
      }, DURATION + 30);
    }

    function animateClose(title) {
      var content = getContent(title);
      title.classList.remove('elementor-active');
      title.setAttribute('aria-expanded', 'false');
      if (!content) return;
      content.style.overflow = 'hidden';
      content.style.height = content.scrollHeight + 'px';
      content.style.opacity = '1';
      content.offsetHeight;
      content.style.transition =
        'height ' + DURATION + 'ms ease, opacity ' + DURATION + 'ms ease';
      content.style.height = '0px';
      content.style.opacity = '0';
      window.setTimeout(function () {
        content.classList.remove('elementor-active');
        content.hidden = true;
        content.style.display = 'none';
        content.style.height = '';
        content.style.overflow = '';
        content.style.transition = '';
        content.style.opacity = '';
      }, DURATION + 30);
    }

    document.querySelectorAll('.elementor-widget-accordion .elementor-accordion').forEach(function (root) {
      if (root.dataset.astroAccordion) return;
      root.dataset.astroAccordion = '1';

      // Collapse all by default (match live collapsed FAQ look)
      root.querySelectorAll('.elementor-tab-title').forEach(function (title) {
        var content = getContent(title);
        title.classList.remove('elementor-active');
        title.setAttribute('aria-expanded', 'false');
        if (content) {
          content.classList.remove('elementor-active');
          content.hidden = true;
          content.style.display = 'none';
        }
      });

      root.addEventListener('click', function (e) {
        var title = e.target.closest('.elementor-tab-title');
        if (!title || !root.contains(title)) return;
        e.preventDefault();
        var willOpen = !title.classList.contains('elementor-active');
        root.querySelectorAll('.elementor-tab-title.elementor-active').forEach(function (t) {
          if (t !== title) animateClose(t);
        });
        if (willOpen) animateOpen(title);
        else animateClose(title);
      });
    });
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
        '@media only screen and (-webkit-min-device-pixel-ratio:2),' +
        'only screen and (min-resolution:192dpi),' +
        'only screen and (min-resolution:2dppx){' +
        '.iti-flag,.country-select .flag,.intl-tel-input .iti-flag{background-image:url("' +
        FLAG_PNG_2X +
        '")!important;background-size:5630px 15px!important;}' +
        '}';
      document.head.appendChild(style);
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

    function lookupCountryByIp() {
      var endpoints = [
        'https://ipwho.is/',
        'https://get.geojs.io/v1/ip/country.json',
        'https://ipinfo.io/json',
      ];
      var i = 0;
      return new Promise(function (resolve) {
        function next() {
          if (i >= endpoints.length) {
            resolve('');
            return;
          }
          var url = endpoints[i++];
          fetch(url, { credentials: 'omit' })
            .then(function (res) {
              if (!res.ok) throw new Error(String(res.status));
              return res.json();
            })
            .then(function (data) {
              var code = parseCountry(data);
              if (code) resolve(code);
              else next();
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

    function applyCountry(code) {
      if (typeof window.jQuery === 'undefined') return;
      var $ = window.jQuery;
      var country = (code || 'ae').toLowerCase();
      var $phones = $('.wpcf7-phonetext, input.cg-phone-input');
      var $countries = $('.wpcf7-countrytext, input.cg-country-input');

      if (!$phones.length && !$countries.length) return;

      $phones.each(function () {
        var $el = $(this);
        try {
          if ($el.data('plugin_intlTelInput') || $el.data('intlTelInput')) {
            $el.intlTelInput('destroy');
          }
        } catch (e) {}
        $el.intlTelInput({
          autoHideDialCode: true,
          autoPlaceholder: true,
          nationalMode: true,
          separateDialCode: true,
          hiddenInput: 'full_number',
          initialCountry: country,
          preferredCountries: ['ae', 'sa', 'pk', 'in', 'gb', 'us'],
          utilsScript: UTILS_JS,
        });
        syncDialCodeHidden($el);
        $el.off('countrychange.astroPhone').on('countrychange.astroPhone', function () {
          syncDialCodeHidden($(this));
        });
      });

      $countries.each(function () {
        var $el = $(this);
        try {
          if ($el.data('countrySelect') || $el.parent().hasClass('country-select')) {
            // countrySelect has no reliable destroy; re-init with defaultCountry
          }
        } catch (e) {}
        try {
          $el.countrySelect({
            defaultCountry: country,
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
    if (window.__astroPhoneCountryApplied || window.__astroPhoneCountryPending) {
      injectFlagSpriteCss();
      return;
    }
    window.__astroPhoneCountryPending = true;

    var chain = Promise.resolve();
    if (typeof window.jQuery === 'undefined') {
      window.__astroPhoneCountryPending = false;
      return;
    }
    chain = chain
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
      });

    chain
      .then(function () {
        return lookupCountryByIp();
      })
      .then(function (code) {
        applyCountry(code || 'ae');
        window.__astroPhoneCountryApplied = true;
        window.__astroPhoneCountryPending = false;
      })
      .catch(function () {
        applyCountry('ae');
        window.__astroPhoneCountryApplied = true;
        window.__astroPhoneCountryPending = false;
      });
  }

  function injectMirrorCss() {
    var style = document.getElementById('astro-mirror-fixes-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'astro-mirror-fixes-css';
      document.head.appendChild(style);
    }
    style.textContent = [
      /* Prevent horizontal scroll from stretched sections on mobile */
      'html,body{overflow-x:hidden;max-width:100vw;}',
      /* FAQ affordance */
      '.elementor-widget-accordion .elementor-tab-title{cursor:pointer;}',
      '.elementor-widget-accordion .elementor-tab-content:not(.elementor-active){display:none;}',
      '.elementor-widget-accordion .elementor-tab-content.elementor-active{display:block;}',
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
      /* Contact form response + validation */
      '.wpcf7-form .wpcf7-response-output{display:none;margin:1em 0 .5em;padding:.65em 1em;border:2px solid #00a0d2;background:rgba(0,160,210,.08);color:inherit;border-radius:4px;font-size:14px;line-height:1.4;min-height:1.4em;}',
      '.wpcf7-form .wpcf7-response-output.wpcf7-mail-sent-ok{display:block!important;border-color:#00a0d2;background:rgba(0,160,210,.1);}',
      '.wpcf7-form .wpcf7-response-output.wpcf7-mail-sent-ng,.wpcf7-form .wpcf7-response-output.wpcf7-validation-errors{display:block!important;border-color:#dc3232;background:rgba(220,50,50,.08);}',
      '.wpcf7-form input.astro-field-error,.wpcf7-form textarea.astro-field-error{outline:2px solid #dc3232;outline-offset:1px;}',
      '.wpcf7-form .astro-experience-tip,.wpcf7-form .astro-field-tip,.wpcf7-form .wpcf7-not-valid-tip{display:block;color:#dc3232;font-size:12px;margin-top:8px;line-height:1.3;}',
      '.form-design .wpcf7-response-output,.form-design .wpcf7-response-output.wpcf7-mail-sent-ok,.form-design .wpcf7-response-output.wpcf7-mail-sent-ng,.form-design .wpcf7-response-output.wpcf7-validation-errors{color:#ffffff!important;background:rgba(0,160,210,.22)!important;}',
      '.form-design .wpcf7-response-output.wpcf7-mail-sent-ng,.form-design .wpcf7-response-output.wpcf7-validation-errors{background:rgba(220,50,50,.28)!important;border-color:#ff8a8a!important;}',
      '.form-design .astro-experience-tip,.form-design .astro-field-tip,.form-design .wpcf7-not-valid-tip{color:#ff6b6b;}',
      /* Footer full bleed */
      '.elementor-location-footer,.elementor-location-footer .elementor-section-stretched{width:100%!important;max-width:none!important;}',
      'body .container:has(> .elementor-location-footer){max-width:none!important;width:100%!important;padding-left:0!important;padding-right:0!important;margin-left:0!important;margin-right:0!important;}',
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
      if (root.dataset.astroNestedTabs) return;
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
        });

        panels.forEach(function (panel) {
          var on = panel.id === controls;
          panel.classList.toggle('e-active', on);
          panel.style.setProperty('display', on ? 'flex' : 'none', 'important');
          panel.hidden = !on;
        });
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

    function ensureLegacyTrackingFields(form) {
      if (!form.dataset.submissionId) {
        form.dataset.submissionId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
      }
      var pageUrl = window.location.href;
      var initial = sessionStorage.getItem('cg_initial_url') || pageUrl;
      ensureHiddenField(form, 'form_name', 'Connect Group Contact Form');
      ensureHiddenField(form, 'form_id', form.id || 'legacy-contact-form');
      ensureHiddenField(form, 'page_url', pageUrl);
      ensureHiddenField(form, 'submission_page_url', pageUrl);
      ensureHiddenField(form, 'landing_page_url', initial);
      ensureHiddenField(form, 'referrer_url', document.referrer || '');
      ensureHiddenField(form, 'submission_id', form.dataset.submissionId);
    }

    function captureTrackingFields(form) {
      var params = new URLSearchParams(window.location.search);
      var pageUrl = window.location.href;
      var initial = sessionStorage.getItem('cg_initial_url') || pageUrl;
      if (!sessionStorage.getItem('cg_initial_url')) {
        sessionStorage.setItem('cg_initial_url', pageUrl);
      }
      ensureLegacyTrackingFields(form);

      // Canonical form field → URL query aliases (Google Ads ValueTrack + UTM)
      var TRACKING_FIELDS = {
        gclid: ['gclid'],
        gbraid: ['gbraid'],
        wbraid: ['wbraid'],
        fbclid: ['fbclid'],
        msclkid: ['msclkid'],
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
        matchtype: ['matchtype'],
        device: ['device'],
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
          var v = params.get(aliases[i]);
          if (v) return v;
        }
        return '';
      }

      Object.keys(TRACKING_FIELDS).forEach(function (name) {
        ensureHiddenField(form, name, firstParam(TRACKING_FIELDS[name]));
      });

      ensureHiddenField(form, 'initial_url', initial);
      ensureHiddenField(form, 'landing_page_url', initial);
      ensureHiddenField(form, 'page_url', pageUrl);
      ensureHiddenField(form, 'submission_page_url', pageUrl);
      ensureHiddenField(form, 'referrer_url', document.referrer || '');
    }

    function normalizeNationalPhoneDigits(phone, dialCode) {
      var digits = String(phone.value || '').replace(/\D/g, '');
      var cc = String(dialCode || '').replace(/\D/g, '');
      // Strip duplicated country codes from earlier failed submits / getNumber pollution.
      if (cc) {
        while (digits.indexOf(cc) === 0 && digits.length > cc.length + 5) {
          digits = digits.slice(cc.length);
        }
      }
      return digits;
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

    function buildContactFormData(form) {
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
      return body;
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
        if (form.closest('.form-design') || form.querySelector('.form-design')) {
          output.style.color = '#ffffff';
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
      form.querySelectorAll('.astro-field-tip, .astro-experience-tip').forEach(function (tip) {
        tip.remove();
      });
    }

    function markFieldError(el, message) {
      if (!el) return;
      el.classList.add('astro-field-error');
      el.setAttribute('aria-invalid', 'true');
      if (!message) return;
      var wrap = el.closest('.wpcf7-form-control-wrap') || el.parentElement;
      if (!wrap) return;
      var tip = wrap.querySelector('.astro-field-tip');
      if (!tip) {
        tip = document.createElement('span');
        tip.className = 'astro-field-tip wpcf7-not-valid-tip';
        tip.setAttribute('role', 'alert');
        wrap.appendChild(tip);
      }
      tip.textContent = message;
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

    function isValidPersonName(value) {
      var name = String(value || '').trim().replace(/\s+/g, ' ');
      if (name.length < 2 || name.length > 100) return false;
      if (/@/.test(name) || /\d/.test(name) || /\./.test(name)) return false;
      if (/https?:\/\//i.test(name) || /www\./i.test(name)) return false;
      // Reject domain-like values (xyz.com, foo.co.uk)
      if (/\b[A-Za-zÀ-ÖØ-öø-ÿ0-9][A-Za-zÀ-ÖØ-öø-ÿ0-9-]*\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})*\b/.test(name)) return false;
      if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[\s'-]+[A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(name)) return false;
      return /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(name);
    }

    function isValidEmailAddress(value) {
      var email = String(value || '').trim().toLowerCase();
      if (!email || email.length > 254) return false;
      if (email.indexOf('@') < 0) return false;
      if (email.indexOf('..') >= 0) return false;
      if (!/^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z]{2,})+$/i.test(email)) {
        return false;
      }
      var parts = email.split('@');
      if (parts.length !== 2) return false;
      if (!parts[1] || parts[1].indexOf('.') < 0) return false;
      return true;
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

      var nameEl =
        form.querySelector('[name="full-name"]') ||
        form.querySelector('[name="your-name"]') ||
        form.querySelector('[name="name"]');
      var nameValue = getFieldValue(form, ['full-name', 'your-name', 'name', 'full_name']);
      if (!nameValue) {
        markFieldError(nameEl, 'Your name is required.');
        errors.push('name');
      } else if (!isValidPersonName(nameValue)) {
        markFieldError(nameEl, 'Please enter a valid name.');
        errors.push('name');
      }

      var emailEl = form.querySelector('[name="your-email"]') || form.querySelector('[name="email"]');
      var email = getFieldValue(form, ['your-email', 'email']);
      if (!email) {
        markFieldError(emailEl, 'A valid email address is required.');
        errors.push('email');
      } else if (!isValidEmailAddress(email)) {
        markFieldError(emailEl, 'Please enter a valid email address.');
        errors.push('email');
      }

      var phoneEl = form.querySelector('.wpcf7-phonetext, input.cg-phone-input, input[name^="phonetext"], input[name="phone"]');
      var phoneDigits = getPhoneDigits(form);
      if (!phoneDigits) {
        markFieldError(phoneEl, 'A valid phone number is required.');
        errors.push('phone');
      } else if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        markFieldError(phoneEl, 'Please enter a valid phone number.');
        errors.push('phone');
      }

      var subjectEl = form.querySelector('[name="your-subject"]');
      if (subjectEl && !String(subjectEl.value || '').trim()) {
        markFieldError(subjectEl, 'Please enter a subject.');
        errors.push('subject');
      }

      var messageEl = form.querySelector('[name="your-message"]') || form.querySelector('[name="message"]');
      if (messageEl && !String(messageEl.value || '').trim()) {
        markFieldError(messageEl, 'A message is required.');
        errors.push('message');
      }

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
          showCf7Message(form, 'Please provide all required information.', true);
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

    function enforceNameLettersOnly(form) {
      form
        .querySelectorAll('[name="full-name"], [name="your-name"], [name="name"], [name="full_name"]')
        .forEach(function (input) {
          if (input.dataset.astroNameOnly) return;
          input.dataset.astroNameOnly = '1';
          input.setAttribute('autocomplete', 'name');
          input.addEventListener('input', function () {
            // Letters, spaces, apostrophes, hyphens only — no dots (blocks xyz.com while typing)
            var cleaned = String(input.value || '').replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, '');
            cleaned = cleaned.replace(/\s{2,}/g, ' ');
            if (input.value !== cleaned) input.value = cleaned;
          });
          input.addEventListener('keypress', function (event) {
            if (event.ctrlKey || event.metaKey || event.altKey || !event.key) return;
            if (event.key.length === 1 && !/[A-Za-zÀ-ÖØ-öø-ÿ\s'-]/.test(event.key)) {
              event.preventDefault();
            }
          });
          input.addEventListener('paste', function (event) {
            var text = (event.clipboardData || window.clipboardData).getData('text') || '';
            var cleaned = text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, '').replace(/\s{2,}/g, ' ');
            event.preventDefault();
            var start = input.selectionStart || 0;
            var end = input.selectionEnd || 0;
            input.value = (String(input.value || '').slice(0, start) + cleaned + String(input.value || '').slice(end)).replace(
              /\s{2,}/g,
              ' ',
            );
          });
        });
    }

    function enforceEmailFormatHints(form) {
      form.querySelectorAll('[name="your-email"], [name="email"]').forEach(function (input) {
        if (input.dataset.astroEmailOnly) return;
        input.dataset.astroEmailOnly = '1';
        input.type = 'email';
        input.setAttribute('autocomplete', 'email');
        input.setAttribute('inputmode', 'email');
        input.addEventListener('input', function () {
          // Strip spaces; emails cannot contain whitespace.
          var cleaned = String(input.value || '').replace(/\s+/g, '');
          if (input.value !== cleaned) input.value = cleaned;
        });
      });
    }

    function enforcePhoneDigitsOnly(form) {
      form.querySelectorAll('.wpcf7-phonetext, input.cg-phone-input, input[name^="phonetext"], input[name="phone"]').forEach(function (phone) {
        if (phone.dataset.astroDigitsOnly) return;
        phone.dataset.astroDigitsOnly = '1';
        phone.setAttribute('inputmode', 'numeric');
        phone.setAttribute('autocomplete', 'tel');
        if (phone.type === 'text') phone.type = 'tel';
        phone.addEventListener('input', function () {
          var cleaned = String(phone.value || '').replace(/[^\d]/g, '');
          if (phone.value !== cleaned) phone.value = cleaned;
        });
        phone.addEventListener('keypress', function (event) {
          if (event.ctrlKey || event.metaKey || event.altKey || !event.key) return;
          if (event.key.length === 1 && !/\d/.test(event.key)) {
            event.preventDefault();
          }
        });
        phone.addEventListener('paste', function (event) {
          var text = (event.clipboardData || window.clipboardData).getData('text') || '';
          var cleaned = text.replace(/[^\d]/g, '');
          event.preventDefault();
          var start = phone.selectionStart || 0;
          var end = phone.selectionEnd || 0;
          var next = String(phone.value || '').slice(0, start) + cleaned + String(phone.value || '').slice(end);
          phone.value = next.replace(/[^\d]/g, '');
        });
      });
    }

    function wireFieldInputGuards(form) {
      enforceNameLettersOnly(form);
      enforceEmailFormatHints(form);
      enforcePhoneDigitsOnly(form);
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
      wireFieldInputGuards(form);
      captureTrackingFields(form);
      syncPhoneNumbers(form);

      if (!validateLegacyContactForm(form)) return;

      ensureHiddenField(form, 'submitted_at', new Date().toISOString());
      form.__astroSubmitting = true;
      setSubmitting(form, true);
      showCf7Message(form, 'Sending…', false);

      fetch('/api/contact', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: buildContactFormData(form),
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
              wireFieldInputGuards(form);
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
      wireFieldInputGuards(form);
    });
  }

  function boot() {
    safe(injectMirrorCss);
    safe(wireLegacyContactForms);
    safe(unwrapRocketLazyScripts);
    safe(prepareTestimonialCarousels);
    safe(ensureLazyImages);
    safe(animateCounters);
    safe(ensureBackgroundVideos);
    safe(ensureLottieIcons);
    safe(ensureTestimonialSwiper);
    safe(ensureNestedCarousels);
    safe(ensureImageCarousels);
    safe(ensureClassicAccordion);
    safe(ensureBootstrapCollapseAccordions);
    safe(ensureNestedAccordion);
    safe(decodeCloudflareEmails);
    safe(ensureShareButtons);
    safe(ensurePixfortAnimations);
    safe(ensureClassicTabs);
    safe(ensureNestedTabs);
    safe(ensureStretchedSections);
    safe(ensureScrollsequence);
    // Wait for jQuery + nbcpf plugins (deferred) before fixing phone fields
    setTimeout(function () {
      safe(ensurePhoneCountryFields);
    }, 600);
    setTimeout(function () {
      safe(unwrapRocketLazyScripts);
      safe(nudgeElementor);
      safe(ensureLazyImages);
      safe(animateCounters);
      safe(ensureBackgroundVideos);
      safe(ensureLottieIcons);
      safe(ensureTestimonialSwiper);
      safe(ensureNestedCarousels);
      safe(ensureImageCarousels);
      safe(ensureClassicAccordion);
    safe(ensureBootstrapCollapseAccordions);
    safe(ensureNestedAccordion);
    safe(decodeCloudflareEmails);
    safe(ensureShareButtons);
      safe(ensurePixfortAnimations);
      safe(ensureClassicTabs);
      safe(ensureNestedTabs);
      safe(ensureStretchedSections);
      safe(ensureScrollsequence);
      safe(ensurePhoneCountryFields);
    }, 1200);
    // Swiper / Elementor modules often finish later than DOMContentLoaded
    setTimeout(function () {
      safe(ensureNestedCarousels);
      safe(ensureImageCarousels);
      safe(ensureTestimonialSwiper);
      safe(ensureLazyImages);
      safe(ensureClassicAccordion);
    safe(ensureBootstrapCollapseAccordions);
    safe(ensureNestedAccordion);
    safe(decodeCloudflareEmails);
    safe(ensureShareButtons);
      safe(ensurePixfortAnimations);
      safe(ensureStretchedSections);
      safe(ensureScrollsequence);
      safe(ensurePhoneCountryFields);
    }, 2500);
  }

  function ensureMobileNav() {
    if (document.querySelector('script[src="/js/cg-mobile-nav.js"]')) return;
    if (!document.getElementById('cg-mobile-nav-css')) {
      var link = document.createElement('link');
      link.id = 'cg-mobile-nav-css';
      link.rel = 'stylesheet';
      link.href = '/chrome/mobile-nav.css';
      document.head.appendChild(link);
    }
    var script = document.createElement('script');
    script.src = '/js/cg-mobile-nav.js';
    script.defer = true;
    document.body.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Mobile accordion nav (Services mega for ≤991px)
  safe(ensureMobileNav);

  // If any Rocket leftovers fire later, re-run widget fallbacks
  window.addEventListener('rocket-allScriptsLoaded', function () {
    safe(ensureNestedCarousels);
    safe(ensureImageCarousels);
    safe(ensureTestimonialSwiper);
    safe(ensureLazyImages);
    safe(ensureClassicAccordion);
    safe(ensureBootstrapCollapseAccordions);
    safe(ensureNestedAccordion);
    safe(decodeCloudflareEmails);
    safe(ensureShareButtons);
    safe(ensurePixfortAnimations);
    safe(ensureStretchedSections);
    safe(ensureScrollsequence);
    safe(ensurePhoneCountryFields);
  });
})();
