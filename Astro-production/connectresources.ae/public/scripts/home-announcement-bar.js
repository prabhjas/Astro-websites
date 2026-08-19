/**
 * Homepage only — hide the security advisory bar on scroll down; show at top.
 */
(function () {
  if (!document.body.classList.contains("home")) return;

  var threshold = 12;
  var ticking = false;
  var bar = document.getElementById("cr-home-announcement");

  function measure() {
    if (!bar) return;
    var hidden = document.body.classList.contains("cr-announcement-hidden");
    var h = hidden ? 0 : bar.offsetHeight;
    if (!hidden && h < 1) h = bar.scrollHeight;
    document.body.style.setProperty("--cr-announcement-height", h + "px");
  }

  function sync() {
    ticking = false;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.toggle("cr-announcement-hidden", y > threshold);
    measure();
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(sync);
  }

  sync();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
})();
