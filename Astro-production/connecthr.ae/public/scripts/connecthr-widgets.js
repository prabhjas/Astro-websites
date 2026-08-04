/**
 * Connect HR — vanilla handlers for Elementor widgets that need JS on a static
 * mirror (Elementor's webpack frontend does not bootstrap without WordPress).
 * Covers: self-hosted background video, animated counters, Pro "sticky" top bar.
 * Accordions/toggles are handled by accordion.js; nested accordions (FAQ) use
 * native <details> and need no JS.
 */
(() => {
  const parseSettings = (el) => {
    // Browser decodes &quot; → " in getAttribute; keep a fallback for safety.
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

  // 1. Self-hosted Elementor background video (hero) — set src + play.
  function initBgVideo() {
    document.querySelectorAll("video.elementor-background-video-hosted").forEach((video) => {
      if (video.dataset.chrBound) return;
      let node = video.closest("[data-settings]");
      let link = "";
      while (node && !link) {
        const s = parseSettings(node);
        if (s.background_video_link) link = String(s.background_video_link).replace(/\\\//g, "/");
        node = node.parentElement ? node.parentElement.closest("[data-settings]") : null;
      }
      if (!link) return;
      video.dataset.chrBound = "1";
      if (!video.getAttribute("src")) video.setAttribute("src", link);
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.setAttribute("playsinline", "");
      const play = video.play();
      if (play && play.catch) play.catch(() => {});
    });
  }

  // 2. Animated counters — count up when scrolled into view.
  function animate(num) {
    if (num.dataset.chrCounted) return;
    num.dataset.chrCounted = "1";
    const to = parseFloat(num.getAttribute("data-to-value")) || 0;
    const from = parseFloat(num.getAttribute("data-from-value")) || 0;
    const dur = parseInt(num.getAttribute("data-duration"), 10) || 2000;
    const delim = num.getAttribute("data-delimiter") || ",";
    const decimals = (String(num.getAttribute("data-to-value") || "").split(".")[1] || "").length;
    const fmt = (v) =>
      v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, delim);
    // Respect reduced-motion / environments without rAF — show the final value.
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
    if (initCounters.bound) {
      checkCounters();
      return;
    }
    initCounters.bound = true;
    window.addEventListener("scroll", checkCounters, { passive: true });
    window.addEventListener("resize", checkCounters);
    checkCounters();
  }

  // 3. Elementor Pro "sticky: top" — pin element + toggle active class for CSS gradient.
  function initSticky() {
    document.querySelectorAll("[data-settings]").forEach((el) => {
      if (el.dataset.chrSticky) return;
      const s = parseSettings(el);
      if (s.sticky !== "top") return;
      el.dataset.chrSticky = "1";
      const startTop = el.getBoundingClientRect().top + window.scrollY;
      const onScroll = () => {
        const active = window.scrollY > startTop;
        el.classList.toggle("elementor-sticky--active", active);
        el.classList.toggle("elementor-sticky--effects", active);
        if (active) {
          el.style.position = "fixed";
          el.style.top = "0";
          el.style.left = "0";
          el.style.right = "0";
          el.style.width = "100%";
          el.style.zIndex = "999";
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

  function init() {
    initBgVideo();
    initCounters();
    initSticky();
  }
  init();
  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);
  [200, 800, 2000].forEach((ms) => setTimeout(init, ms));
})();
