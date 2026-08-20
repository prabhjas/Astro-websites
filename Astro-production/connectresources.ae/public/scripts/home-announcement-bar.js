/**
 * Homepage only — hide the security advisory bar on scroll down; show at top.
 */
(function () {
  if (!document.body.classList.contains("home")) return;

  var threshold = 12;
  var ticking = false;
  var bar = document.getElementById("cr-home-announcement");
  var cachedHeight = 0;

  function measure() {
    if (!bar) return;
    var h = bar.scrollHeight;
    if (h < 1) h = bar.offsetHeight;
    if (h < 1) h = 36;
    if (h === cachedHeight) return;
    cachedHeight = h;
    document.body.style.setProperty("--cr-announcement-height", h + "px");
  }

  function sync() {
    ticking = false;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.toggle("cr-announcement-hidden", y > threshold);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(sync);
  }

  measure();
  sync();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
})();
