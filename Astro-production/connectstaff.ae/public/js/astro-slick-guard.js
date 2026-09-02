(function () {
  if (typeof window.jQuery === 'undefined' || !window.jQuery.fn || !window.jQuery.fn.slick) return;
  if (window.jQuery.fn.slick.__astroWrapped) return;
  var orig = window.jQuery.fn.slick;
  window.jQuery.fn.slick = function () {
    try {
      return orig.apply(this, arguments);
    } catch (e) {
      return this;
    }
  };
  window.jQuery.fn.slick.__astroWrapped = true;
})();
