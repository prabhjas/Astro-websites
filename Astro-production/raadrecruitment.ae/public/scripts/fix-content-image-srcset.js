/**
 * Prefer full-size upload candidates over tiny 300w lazy picks.
 * sizes="auto" was selecting 300px sources and collapsing layout.
 */
(function () {
  function fix() {
    document.querySelectorAll(".l-main img[srcset]").forEach(function (img) {
      if (img.getAttribute("data-srcset-fixed") === "1") return;
      var srcset = img.getAttribute("srcset") || "";
      if (!srcset) return;
      // Prefer the largest declared candidate in srcset
      var parts = srcset.split(",").map(function (p) {
        return p.trim();
      });
      var best = null;
      var bestW = 0;
      parts.forEach(function (p) {
        var m = p.match(/(\S+)\s+(\d+)w/);
        if (!m) return;
        var w = parseInt(m[2], 10);
        if (w > bestW) {
          bestW = w;
          best = m[1];
        }
      });
      if (best && bestW >= 200) {
        img.setAttribute("src", best);
        img.setAttribute("sizes", Math.min(bestW, 1280) + "px");
        img.removeAttribute("height");
        img.setAttribute("data-srcset-fixed", "1");
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fix);
  } else {
    fix();
  }
  window.addEventListener("load", fix);
})();
