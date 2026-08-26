/**
 * Wire Elementor share-button widgets into real share links on every page.
 * Uses the current page URL/title so local + production both share correctly.
 */
(function () {
  function pageUrl() {
    try {
      return window.location.href.split("#")[0];
    } catch {
      return window.location.href;
    }
  }

  function pageTitle() {
    const h1 = document.querySelector(
      "body.single-post h1.elementor-heading-title, body.single-post .sp-article__header h1, h1",
    );
    if (h1 && h1.textContent.trim()) return h1.textContent.trim();
    return document.title || "";
  }

  function shareHref(network, url, title) {
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);
    switch (network) {
      case "facebook":
        return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
      case "linkedin":
        return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
      case "twitter":
      case "x":
        return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
      case "whatsapp":
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${url}`)}`;
      case "email":
        return `mailto:?subject=${t}&body=${encodeURIComponent(`${title}\n\n${url}`)}`;
      case "pinterest":
        return `https://pinterest.com/pin/create/button/?url=${u}&description=${t}`;
      case "telegram":
        return `https://t.me/share/url?url=${u}&text=${t}`;
      default:
        return null;
    }
  }

  function detectNetwork(el) {
    const cls = el.className || "";
    const m = cls.match(/elementor-share-btn_([a-z0-9_-]+)/i);
    if (m) return m[1].toLowerCase();
    const label = (el.getAttribute("aria-label") || "").toLowerCase();
    if (label.includes("facebook")) return "facebook";
    if (label.includes("linkedin")) return "linkedin";
    if (label.includes("twitter") || label.includes("x.com")) return "twitter";
    if (label.includes("whatsapp")) return "whatsapp";
    if (label.includes("email") || label.includes("mail")) return "email";
    if (label.includes("pinterest")) return "pinterest";
    if (label.includes("telegram")) return "telegram";
    return null;
  }

  function upgrade(btn) {
    if (btn.dataset.spShareWired === "1") return;
    const network = detectNetwork(btn);
    if (!network) return;
    const href = shareHref(network, pageUrl(), pageTitle());
    if (!href) return;

    const a = document.createElement("a");
    a.className = btn.className;
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", btn.getAttribute("aria-label") || `Share on ${network}`);
    a.dataset.spShareWired = "1";
    // Keep keyboard focusability without Elementor's role=button behavior
    a.removeAttribute("role");
    a.removeAttribute("tabindex");
    while (btn.firstChild) a.appendChild(btn.firstChild);
    btn.replaceWith(a);
  }

  function init() {
    document.querySelectorAll(".elementor-share-btn").forEach(upgrade);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
