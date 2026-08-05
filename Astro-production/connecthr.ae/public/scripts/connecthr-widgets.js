/**
 * Connect HR — vanilla handlers for Elementor widgets on the static Astro mirror.
 * Covers: background video, counters, sticky top bar, demo popups, mega-menu,
 * and WP Rocket–style lazy images (data-lazy-src → src).
 */
(() => {
  const parseSettings = (el) => {
    const raw = el.getAttribute("data-settings") || "";
    try {
      return JSON.parse(raw);
    } catch {
      const out = {};
      const m = raw.match(/background_video_link(?:&quot;|")\s*:\s*(?:&quot;|")([^&"]+)/);
      if (m) out.background_video_link = m[1];
      if (/(sticky(?:&quot;|")\s*:\s*(?:&quot;|")top)/.test(raw)) out.sticky = "top";
      return out;
    }
  };

  // 0. Promote lazy-loaded images/backgrounds (WP Rocket / CF placeholders).
  function hydrateLazyMedia(root = document) {
    root.querySelectorAll("img[data-lazy-src], img[data-src]").forEach((img) => {
      const real = img.getAttribute("data-lazy-src") || img.getAttribute("data-src");
      if (!real) return;
      const cur = img.getAttribute("src") || "";
      if (!cur || cur.startsWith("data:image") || cur.includes("lazy") || cur === real) {
        img.setAttribute("src", real);
      }
      const lazySet = img.getAttribute("data-lazy-srcset") || img.getAttribute("data-srcset");
      if (lazySet) img.setAttribute("srcset", lazySet);
      img.removeAttribute("data-lazy-src");
      img.removeAttribute("data-src");
      img.classList.remove("lazyload", "lazyloading");
      img.classList.add("lazyloaded");
    });

    root.querySelectorAll("[data-lazy-bg], [data-bg]").forEach((el) => {
      const bg = el.getAttribute("data-lazy-bg") || el.getAttribute("data-bg");
      if (bg) el.style.backgroundImage = `url("${bg}")`;
    });

    // noscript fallbacks sometimes hold the real <img>
    root.querySelectorAll("noscript").forEach((ns) => {
      const html = ns.textContent || "";
      if (!/<img\b/i.test(html)) return;
      const prev = ns.previousElementSibling;
      if (prev && prev.tagName === "IMG" && (prev.src || "").startsWith("data:image")) {
        const m = html.match(/src=["']([^"']+)["']/i);
        if (m) prev.setAttribute("src", m[1]);
      }
    });
  }

  // 1. Self-hosted + YouTube Elementor background videos.
  function youtubeIdFromUrl(url) {
    const m = String(url || "").match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{6,})/,
    );
    return m ? m[1] : "";
  }

  function initBgVideo() {
    document.querySelectorAll("[data-settings*='background_video'], [data-settings*='background_background']").forEach((section) => {
      const s = parseSettings(section);
      if (!s || String(s.background_background || "") !== "video") return;
      let link = String(s.background_video_link || "").replace(/\\\//g, "/");
      if (!link) return;

      const container =
        section.querySelector(":scope > .elementor-background-video-container, .elementor-background-video-container") ||
        null;
      if (!container) return;

      const yt = youtubeIdFromUrl(link);
      if (yt) {
        if (container.querySelector("iframe.elementor-background-video-embed")) return;
        const origin = encodeURIComponent(window.location.origin);
        const iframe = document.createElement("iframe");
        iframe.className = "elementor-background-video-embed";
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("allow", "autoplay; encrypted-media");
        iframe.title = "Background video";
        iframe.src =
          `https://www.youtube.com/embed/${yt}?controls=0&rel=0&playsinline=1&enablejsapi=1` +
          `&autoplay=1&mute=1&loop=1&playlist=${yt}&origin=${origin}`;
        container.appendChild(iframe);
        return;
      }

      const video =
        container.querySelector("video.elementor-background-video-hosted") ||
        container.querySelector("video");
      if (!video) return;
      if (video.dataset.chrBound && video.getAttribute("src")) return;
      video.dataset.chrBound = "1";
      if (!video.getAttribute("src")) video.setAttribute("src", link);
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("muted", "");
      const play = video.play();
      if (play && play.catch) play.catch(() => {});
    });

    // Fallback: videos present without walking sections
    document.querySelectorAll("video.elementor-background-video-hosted").forEach((video) => {
      if (video.dataset.chrBound && video.getAttribute("src")) return;
      let node = video.closest("[data-settings]");
      let link = "";
      while (node && !link) {
        const s = parseSettings(node);
        if (s.background_video_link) {
          link = String(s.background_video_link).replace(/\\\//g, "/");
        }
        node = node.parentElement ? node.parentElement.closest("[data-settings]") : null;
      }
      if (!link || /youtube|vimeo/i.test(link)) return;
      video.dataset.chrBound = "1";
      if (!video.getAttribute("src")) video.setAttribute("src", link);
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.setAttribute("playsinline", "");
      const play = video.play();
      if (play && play.catch) play.catch(() => {});
    });

    // Standard Elementor / WP video widgets (non-background)
    document.querySelectorAll(".elementor-wrapper video, .elementor-video video, video[data-src]").forEach((video) => {
      const lazy = video.getAttribute("data-src") || video.getAttribute("data-lazy-src");
      if (lazy && !video.getAttribute("src")) video.setAttribute("src", lazy);
    });
    document.querySelectorAll("iframe[data-src*='youtube'], iframe[data-lazy-src*='youtube']").forEach((iframe) => {
      const real = iframe.getAttribute("data-src") || iframe.getAttribute("data-lazy-src");
      if (real && !(iframe.getAttribute("src") || "").includes("youtube")) {
        iframe.setAttribute("src", real);
      }
    });
  }

  // 2. Animated counters.
  function animate(num) {
    if (num.dataset.chrCounted) return;
    num.dataset.chrCounted = "1";
    const to = parseFloat(num.getAttribute("data-to-value")) || 0;
    const from = parseFloat(num.getAttribute("data-from-value")) || 0;
    const dur = parseInt(num.getAttribute("data-duration"), 10) || 2000;
    const delim = num.getAttribute("data-delimiter") || ",";
    const decimals = (String(num.getAttribute("data-to-value") || "").split(".")[1] || "").length;
    const fmt = (v) => v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, delim);
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof requestAnimationFrame !== "function") {
      num.textContent = fmt(to);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      num.textContent = fmt(from + (to - from) * t);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return r.top < vh * 0.9 && r.bottom > 0;
  };
  function checkCounters() {
    document.querySelectorAll(".elementor-counter-number").forEach((n) => {
      if (!n.dataset.chrCounted && inView(n)) animate(n);
    });
  }
  function initCounters() {
    if (!initCounters.bound) {
      initCounters.bound = true;
      window.addEventListener("scroll", checkCounters, { passive: true });
      window.addEventListener("resize", checkCounters);
    }
    checkCounters();
  }

  // 3. Sticky ONLY the home top promo bar — do not pin the whole header.
  function initSticky() {
    document.querySelectorAll(".home-top-bar[data-settings], .elementor-element-f67d323[data-settings]").forEach((el) => {
      if (el.dataset.chrSticky) return;
      const s = parseSettings(el);
      if (s.sticky !== "top" && !el.classList.contains("home-top-bar")) return;
      el.dataset.chrSticky = "1";
      const startTop = el.getBoundingClientRect().top + window.scrollY;
      const onScroll = () => {
        const active = window.scrollY > startTop + 4;
        el.classList.toggle("elementor-sticky--active", active);
        el.classList.toggle("elementor-sticky--effects", active);
        if (active) {
          el.style.position = "fixed";
          el.style.top = "0";
          el.style.left = "0";
          el.style.right = "0";
          el.style.width = "100%";
          el.style.zIndex = "10000";
        } else {
          el.style.position = "";
          el.style.top = "";
          el.style.left = "";
          el.style.right = "";
          el.style.width = "";
          el.style.zIndex = "";
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    });
  }

  // 4. Elementor Pro popup open/close.
  function b64Json(raw) {
    try {
      const pad = "=".repeat((4 - (raw.length % 4)) % 4);
      return JSON.parse(atob(raw + pad));
    } catch {
      return null;
    }
  }

  function parsePopupIdFromHref(href) {
    if (!href) return "";
    let decoded = href;
    try {
      decoded = decodeURIComponent(href);
    } catch {
      /* keep */
    }
    const m = decoded.match(/action=popup:open&settings=([^&#]+)/i);
    if (!m) return "";
    const settings = b64Json(m[1]);
    return settings && settings.id != null ? String(settings.id) : "";
  }

  function ensureModalShell() {
    let modal = document.getElementById("chr-popup-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "chr-popup-modal";
    modal.className =
      "dialog-widget dialog-lightbox-widget dialog-type-lightbox elementor-popup-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML =
      '<div class="dialog-widget-content dialog-lightbox-widget-content">' +
      '<button type="button" class="dialog-close-button dialog-lightbox-close-button" aria-label="Close">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
      '<path fill="#1a1a1a" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/>' +
      "</svg></button>" +
      '<div class="dialog-message dialog-lightbox-message"></div></div>';
    document.body.appendChild(modal);

    const onCloseClick = (e) => {
      const btn = e.target?.closest?.(".dialog-close-button, .dialog-lightbox-close-button");
      if (!btn || !modal.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      closePopup();
    };
    // Capture so nothing inside the popup can swallow the close click
    modal.addEventListener("click", onCloseClick, true);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closePopup();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("dialog-visible")) closePopup();
    });
    return modal;
  }

  function closePopup() {
    const modal = document.getElementById("chr-popup-modal");
    if (!modal) return;
    const msg = modal.querySelector(".dialog-message");
    const host = document.querySelector("[data-chr-popups]");
    if (msg && host) {
      [...msg.querySelectorAll('[data-elementor-type="popup"]')].forEach((el) => host.appendChild(el));
    }
    modal.classList.remove("dialog-visible");
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("elementor-popup-modal-open");
    document.body.style.removeProperty("overflow");
  }

  function openPopup(id) {
    if (!id) return;
    const source = document.querySelector(`[data-elementor-type="popup"][data-elementor-id="${id}"]`);
    if (!source) return;
    const modal = ensureModalShell();
    const msg = modal.querySelector(".dialog-message");
    if (!msg) return;
    const host = document.querySelector("[data-chr-popups]");
    [...msg.querySelectorAll('[data-elementor-type="popup"]')].forEach((el) => {
      if (el !== source && host) host.appendChild(el);
    });
    msg.appendChild(source);
    source.style.setProperty("display", "block", "important");
    modal.style.display = "flex";
    modal.classList.add("dialog-visible");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("elementor-popup-modal-open");
    document.body.style.overflow = "hidden";
    hydrateLazyMedia(source);
    // Counters sit at "0" until scrolled into view — force-run inside the open popup
    source.querySelectorAll(".elementor-counter-number").forEach((n) => {
      delete n.dataset.chrCounted;
      animate(n);
    });
    // Re-init phone flags for forms that were hidden in the popup host
    try {
      window.dispatchEvent(new CustomEvent("chr:popup-opened", { detail: { id, root: source } }));
    } catch {
      /* ignore */
    }
  }

  function initPopups() {
    if (initPopups.bound) return;
    initPopups.bound = true;
    const host = document.querySelector("[data-chr-popups]");
    if (host) {
      host.hidden = false;
      host.removeAttribute("aria-hidden");
      host.style.position = "absolute";
      host.style.width = "1px";
      host.style.height = "1px";
      host.style.overflow = "hidden";
      host.style.clip = "rect(0 0 0 0)";
    }
    document.addEventListener(
      "click",
      (e) => {
        const a = e.target?.closest?.(
          "a[href*='elementor-action'], a[href*='popup%3Aopen'], a[href*='popup:open']",
        );
        if (!a) return;
        const id = parsePopupIdFromHref(a.getAttribute("href") || "");
        if (!id) return;
        e.preventDefault();
        openPopup(id);
      },
      true,
    );
  }

  // 5. Mega menu — desktop hover + mobile burger/accordion (matches Elementor Pro).
  // Live kit tablet breakpoint for e-n-menu-tablet is 992px (not 1024).
  const MQ_DROPDOWN = "(max-width: 992px)";

  function isDropdownViewport() {
    return window.matchMedia(MQ_DROPDOWN).matches;
  }

  /** Elementor activateTab: e-active on panel .e-con AND parent .e-n-menu-content */
  function panelParts(item) {
    const btn = item.querySelector(":scope > .e-n-menu-title .e-n-menu-dropdown-icon");
    const wrap = item.querySelector(":scope > .e-n-menu-content");
    const id = btn?.getAttribute("aria-controls");
    let panel = null;
    if (id) {
      try {
        panel = item.querySelector("#" + CSS.escape(id));
      } catch {
        panel = item.querySelector('[id="' + id.replace(/"/g, '\\"') + '"]');
      }
    }
    if (!panel) panel = wrap?.querySelector(":scope > .e-con") || null;
    return { btn, wrap, panel };
  }

  /** Mimic Elementor Pro stretch for e-full_width mega menus */
  function applyMenuStretch(menu) {
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const left = Math.max(0, Math.round(rect.left));
    const right = Math.max(0, Math.round(window.innerWidth - rect.right));
    const width = Math.max(window.innerWidth, document.documentElement.clientWidth);
    menu.style.setProperty("--stretch-left", `-${left}px`);
    menu.style.setProperty("--stretch-right", `-${right}px`);
    menu.style.setProperty("--stretch-width", `${width}px`);
  }

  function closeMenuItem(item) {
    const { btn, wrap, panel } = panelParts(item);
    if (btn) btn.setAttribute("aria-expanded", "false");
    item.classList.remove("e-current");
    item.querySelectorAll(".e-n-menu-title").forEach((t) => t.classList.remove("e-current"));
    panel?.classList.remove("e-active");
    wrap?.classList.remove("e-active");
  }

  function openMenuItem(item, menu) {
    if (!item) return;
    menu.querySelectorAll(".e-n-menu-item").forEach((other) => {
      if (other !== item) closeMenuItem(other);
    });
    const { btn, wrap, panel } = panelParts(item);
    // Panel may live under .e-n-menu-content; resolve from menu if scoped query missed it
    let resolved = panel;
    if (!resolved && btn) {
      const id = btn.getAttribute("aria-controls");
      if (id) {
        try {
          resolved = menu.querySelector("#" + CSS.escape(id));
        } catch {
          resolved = menu.querySelector('[id="' + id.replace(/"/g, '\\"') + '"]');
        }
      }
    }
    if (!resolved) return;
    if (btn) btn.setAttribute("aria-expanded", "true");
    item.classList.add("e-current");
    item.querySelectorAll(":scope > .e-n-menu-title").forEach((t) => t.classList.add("e-current"));
    resolved.classList.add("e-active");
    (wrap || resolved.closest(".e-n-menu-content"))?.classList.add("e-active");
    hydrateLazyMedia(item);
  }

  function closeAllInMenu(menu) {
    menu.querySelectorAll(".e-n-menu-item").forEach((item) => closeMenuItem(item));
  }

  function syncMegaMenuLayout() {
    const dropdown = isDropdownViewport();
    document.querySelectorAll(".elementor-widget-n-menu .e-n-menu").forEach((menu) => {
      applyMenuStretch(menu);
      if (dropdown) {
        menu.setAttribute("data-layout", "dropdown");
        // Ensure closed wrapper never participates in document flow (home header includes hero).
        const toggle = menu.querySelector(".e-n-menu-toggle");
        const wrapper = menu.querySelector(".e-n-menu-wrapper");
        if (toggle && toggle.getAttribute("aria-expanded") !== "true" && wrapper) {
          wrapper.style.removeProperty("display");
        }
      } else {
        menu.removeAttribute("data-layout");
        const toggle = menu.querySelector(".e-n-menu-toggle");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
        closeAllInMenu(menu);
        document.documentElement.classList.remove("chr-n-menu-open");
      }
    });
  }

  function initMegaMenu() {
    if (initMegaMenu.bound) {
      syncMegaMenuLayout();
      return;
    }
    initMegaMenu.bound = true;
    syncMegaMenuLayout();
    window.addEventListener("resize", syncMegaMenuLayout);

    // Desktop hover
    document.querySelectorAll(".elementor-widget-n-menu .e-n-menu").forEach((menu) => {
      menu.querySelectorAll(".e-n-menu-item").forEach((item) => {
        const hasDropdown = item.querySelector(".e-n-menu-dropdown-icon");
        if (!hasDropdown) return;

        item.addEventListener("mouseenter", () => {
          if (isDropdownViewport()) return;
          openMenuItem(item, menu);
        });
      });

      menu.addEventListener("mouseleave", () => {
        if (isDropdownViewport()) return;
        closeAllInMenu(menu);
      });
    });

    // Click: mobile burger + accordion / desktop title click
    document.addEventListener("click", (e) => {
      const toggle = e.target?.closest?.(".e-n-menu-toggle");
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        const menu = toggle.closest(".e-n-menu");
        if (!menu) return;
        menu.setAttribute("data-layout", "dropdown");
        applyMenuStretch(menu);
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        document.documentElement.classList.toggle("chr-n-menu-open", !expanded);
        if (!expanded) {
          // Anchor below the nav row only — NEVER the full home header (5406 includes the hero).
          const navRow =
            toggle.closest(".elementor-inner-section") ||
            toggle.closest(".elementor-element.menu-main") ||
            toggle.closest(".elementor-widget-n-menu") ||
            toggle;
          const topBar = document.querySelector(".home-top-bar");
          let bottom = Math.ceil(navRow.getBoundingClientRect().bottom);
          if (topBar) {
            const tb = topBar.getBoundingClientRect();
            if (tb.bottom > 0 && tb.top < 80) bottom = Math.max(bottom, Math.ceil(tb.bottom));
          }
          // Cap so a mis-detected hero section cannot push the drawer below the fold
          const top = Math.max(56, Math.min(bottom, 140));
          document.documentElement.style.setProperty("--chr-mobile-menu-top", `${top}px`);
        }
        if (expanded) closeAllInMenu(menu);
        return;
      }

      const dropBtn = e.target?.closest?.(".e-n-menu-dropdown-icon");
      const title = e.target?.closest?.(".e-n-menu-title");
      const item = (dropBtn || title)?.closest?.(".e-n-menu-item");
      const menu = item?.closest?.(".e-n-menu");
      if (!item || !menu || !item.querySelector(".e-n-menu-dropdown-icon")) return;

      // On desktop, title click should navigate only if it's a real link without dropdown intent
      if (!isDropdownViewport()) {
        // Allow hover-driven open; if user clicks chevron, toggle
        if (!dropBtn) return;
        e.preventDefault();
        e.stopPropagation();
        const btn = item.querySelector(".e-n-menu-dropdown-icon");
        const open = btn?.getAttribute("aria-expanded") === "true";
        if (open) closeMenuItem(item);
        else openMenuItem(item, menu);
        return;
      }

      // Mobile accordion — title or chevron toggles submenu
      if (dropBtn || (title && item.querySelector(".e-n-menu-dropdown-icon"))) {
        e.preventDefault();
        e.stopPropagation();
        menu.setAttribute("data-layout", "dropdown");
        const btn = item.querySelector(".e-n-menu-dropdown-icon");
        const open = btn?.getAttribute("aria-expanded") === "true";
        if (open) closeMenuItem(item);
        else openMenuItem(item, menu);
      }
    });

    // Close mobile menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!isDropdownViewport()) return;
      if (e.target?.closest?.(".elementor-widget-n-menu")) return;
      document.querySelectorAll(".e-n-menu-toggle[aria-expanded='true']").forEach((toggle) => {
        toggle.setAttribute("aria-expanded", "false");
        const menu = toggle.closest(".e-n-menu");
        if (menu) closeAllInMenu(menu);
      });
      document.documentElement.classList.remove("chr-n-menu-open");
    });
  }

  // 6. Elementor Table of Contents — live fills this client-side from h2s.
  function slugifyHeading(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
  }

  function parseTocSettings(widget) {
    const raw = widget.getAttribute("data-settings") || "";
    try {
      return JSON.parse(raw);
    } catch {
      const tags = [];
      const tm = raw.match(/headings_by_tags(?:&quot;|")\s*:\s*\[([^\]]*)\]/);
      if (tm) {
        for (const t of tm[1].matchAll(/(?:&quot;|")(h[1-6])(?:&quot;|")/g)) tags.push(t[1]);
      }
      const cm = raw.match(/container(?:&quot;|")\s*:\s*(?:&quot;|")([^&"]+)/);
      return {
        headings_by_tags: tags.length ? tags : ["h2"],
        container: cm ? cm[1] : "",
      };
    }
  }

  function initTableOfContents() {
    document.querySelectorAll(".elementor-widget-table-of-contents").forEach((widget) => {
      let body = widget.querySelector(".elementor-toc__body");
      if (!body) {
        body = document.createElement("div");
        body.className = "elementor-toc__body";
        body.id =
          widget.querySelector("[aria-controls]")?.getAttribute("aria-controls") ||
          "elementor-toc-" + Math.random().toString(36).slice(2, 8);
        widget.querySelector(".elementor-widget-container")?.appendChild(body);
      }
      if (body.querySelector("a.elementor-toc__list-item-text")) {
        widget.dataset.chrToc = "1";
        return;
      }
      if (widget.dataset.chrToc === "1") return;

      const settings = parseTocSettings(widget);
      const tags = settings.headings_by_tags || ["h2"];
      const containerSel = settings.container || ".table_only";
      const root =
        document.querySelector(containerSel) ||
        document.querySelector(".elementor-widget-theme-post-content") ||
        document.querySelector(".sp-single-post") ||
        document;

      const selector = tags.join(",");
      const headings = [...root.querySelectorAll(selector)].filter((h) => {
        if (h.closest(".elementor-toc")) return false;
        const text = (h.textContent || "").trim();
        return text.length > 0;
      });
      if (!headings.length) return;

      const listId = body.id || "elementor-toc-" + Math.random().toString(36).slice(2, 8);
      body.id = listId;
      const ol = document.createElement("ol");
      ol.className = "elementor-toc__list-wrapper";

      headings.forEach((heading) => {
        if (!heading.id) {
          const base = slugifyHeading(heading.textContent) || "section";
          let id = base;
          let n = 2;
          while (document.getElementById(id)) {
            id = base + "-" + n++;
          }
          heading.id = id;
        }
        const li = document.createElement("li");
        li.className = "elementor-toc__list-item";
        const wrap = document.createElement("div");
        wrap.className = "elementor-toc__list-item-text-wrapper";
        const a = document.createElement("a");
        a.className = "elementor-toc__list-item-text elementor-toc__list-item-text--level-1";
        a.href = "#" + heading.id;
        a.textContent = (heading.textContent || "").trim();
        wrap.appendChild(a);
        li.appendChild(wrap);
        ol.appendChild(li);
      });

      body.innerHTML = "";
      body.appendChild(ol);
      widget.dataset.chrToc = "1";
      widget.classList.remove("elementor-toc--collapsed");

      if (!widget.dataset.chrTocToggle) {
        widget.dataset.chrTocToggle = "1";
        widget.querySelectorAll(".elementor-toc__toggle-button").forEach((btn) => {
          btn.addEventListener("click", () => {
            const expanded = btn.getAttribute("aria-expanded") !== "false";
            widget.classList.toggle("elementor-toc--collapsed", expanded);
            widget.querySelectorAll(".elementor-toc__toggle-button").forEach((b) => {
              b.setAttribute("aria-expanded", String(!expanded));
            });
          });
        });
      }
    });
  }

  /** Elementor Pro search widget JS is missing locally — unhide + size icons. */
  function initSearchWidgets() {
    document.querySelectorAll(".elementor-widget-search .e-search.hidden").forEach((el) => {
      el.classList.remove("hidden");
    });
    document.querySelectorAll(".elementor-widget-search .e-search-input").forEach((input) => {
      if (input.dataset.chrSearch === "1") return;
      input.dataset.chrSearch = "1";
      const root = input.closest(".e-search");
      const sync = () => root?.classList.toggle("chr-search-has-value", Boolean(input.value));
      input.addEventListener("input", sync);
      sync();
    });
  }

  function init() {
    hydrateLazyMedia();
    initBgVideo();
    initCounters();
    initSticky();
    initPopups();
    initMegaMenu();
    initTableOfContents();
    initSearchWidgets();
  }

  init();
  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);
  [200, 800, 2000].forEach((ms) => setTimeout(init, ms));
})();
