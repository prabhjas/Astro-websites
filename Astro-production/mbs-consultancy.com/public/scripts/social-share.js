/**
 * Blog post custom-share buttons (LinkedIn / Facebook / X / Copy Link).
 * Mirrors the inline script from the live WordPress theme.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var pageUrl = encodeURIComponent(window.location.href);
    var pageTitle = encodeURIComponent(document.title);

    document.querySelectorAll("[data-platform]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var shareUrl = "";
        var platform = this.getAttribute("data-platform");
        if (platform === "linkedin") {
          shareUrl = "https://www.linkedin.com/sharing/share-offsite/?url=" + pageUrl;
        } else if (platform === "facebook") {
          shareUrl = "https://www.facebook.com/sharer.php?u=" + pageUrl;
        } else if (platform === "twitter") {
          shareUrl =
            "https://twitter.com/intent/tweet?url=" + pageUrl + "&text=" + pageTitle;
        }
        if (shareUrl) {
          window.open(shareUrl, "_blank", "width=600,height=500");
        }
      });
    });

    var copyBtn = document.getElementById("copyLink");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var done = function () {
          var label = copyBtn.querySelector("span");
          var prev = label ? label.textContent : null;
          if (label) label.textContent = "Copied!";
          setTimeout(function () {
            if (label && prev != null) label.textContent = prev;
          }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(window.location.href).then(done).catch(function () {
            window.prompt("Copy this link:", window.location.href);
          });
        } else {
          window.prompt("Copy this link:", window.location.href);
        }
      });
    }
  });
})();
