/**
 * Elementor Counter fallback - animates .elementor-counter-number when in view.
 * Live relies on Elementor counter bundle + jquery-numerator; those often don't boot on Astro SSR.
 */
(() => {
  const EASE_OUT = (t) => 1 - Math.pow(1 - t, 3);

  function formatValue(value, delimiter, rounding) {
    const fixed =
      rounding > 0 ? value.toFixed(rounding) : String(Math.round(value));
    if (!delimiter) return fixed;
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, delimiter);
    return parts.join(".");
  }

  function animateNumber(el) {
    if (!(el instanceof HTMLElement) || el.dataset.spCounted === "1") return;
    el.dataset.spCounted = "1";

    const to = Number(el.getAttribute("data-to-value") || el.dataset.toValue || "0");
    const from = Number(el.getAttribute("data-from-value") || el.dataset.fromValue || "0");
    const duration = Number(el.getAttribute("data-duration") || el.dataset.duration || "2000");
    const delimiter = el.getAttribute("data-delimiter") || el.dataset.delimiter || "";
    const match = String(to).match(/\.(.*)/);
    const rounding = match ? match[1].length : 0;

    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / Math.max(1, duration));
      const current = from + (to - from) * EASE_OUT(t);
      el.textContent = formatValue(current, delimiter, rounding);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = formatValue(to, delimiter, rounding);
    }
    requestAnimationFrame(frame);
  }

  function observe(el) {
    if (!(el instanceof HTMLElement) || el.dataset.spCounterObs === "1") return;
    el.dataset.spCounterObs = "1";

    if (!("IntersectionObserver" in window)) {
      animateNumber(el);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          animateNumber(entry.target);
        });
      },
      { threshold: 0.35, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
  }

  function boot() {
    document.querySelectorAll(".elementor-counter-number").forEach(observe);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("load", () => setTimeout(boot, 300));
})();

// Ensure TOC fallback loads even when ElementorScripts.astro is served from a stale SSR build.
(function loadTocFallback() {
  if (document.querySelector('script[src*="elementor-toc.js"]')) return;
  var s = document.createElement("script");
  s.src = "/scripts/elementor-toc.js";
  s.async = false;
  document.head.appendChild(s);
})();
