/**
 * Connect FM author archive Load More (9-per-page cards).
 */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var wrap = document.querySelector("[data-cfm-author-load-more]");
    var grid = document.querySelector("[data-cfm-author-grid]");
    if (!wrap || !grid) return;

    var btn = wrap.querySelector("button");
    if (!btn) return;

    var authorId = wrap.getAttribute("data-author-id") || "";
    var nextPage = Number(wrap.getAttribute("data-next-page") || "2") || 2;
    var perPage = Number(wrap.getAttribute("data-per-page") || "9") || 9;
    var offset = Number(wrap.getAttribute("data-offset") || String(perPage)) || perPage;
    var loading = false;
    var defaultLabel = (btn.textContent || "Load More").trim() || "Load More";

    btn.addEventListener("click", function (event) {
      event.preventDefault();
      if (loading || wrap.hidden) return;
      loading = true;
      btn.disabled = true;
      btn.textContent = "Loading...";

      var url =
        "/api/blog/load-more/?page=" +
        encodeURIComponent(String(nextPage)) +
        "&perPage=" +
        encodeURIComponent(String(perPage)) +
        "&offset=" +
        encodeURIComponent(String(offset)) +
        "&authorId=" +
        encodeURIComponent(authorId);

      fetch(url, { headers: { Accept: "application/json" }, credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.ok || typeof data.html !== "string") throw new Error("bad payload");
          if (data.html) grid.insertAdjacentHTML("beforeend", data.html);
          offset = Number(data.nextOffset != null ? data.nextOffset : offset + perPage);
          wrap.setAttribute("data-offset", String(offset));
          if (data.hasMore && data.nextPage) {
            nextPage = data.nextPage;
            wrap.setAttribute("data-next-page", String(nextPage));
            btn.textContent = defaultLabel;
            btn.disabled = false;
          } else {
            wrap.hidden = true;
            wrap.style.display = "none";
          }
        })
        .catch(function (err) {
          console.error("[cfm-author-load-more]", err);
          btn.textContent = defaultLabel;
          btn.disabled = false;
        })
        .finally(function () {
          loading = false;
        });
    });
  });
})();
