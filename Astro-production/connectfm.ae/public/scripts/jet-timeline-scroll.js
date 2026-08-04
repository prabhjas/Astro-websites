/**
 * Connect FM — Jet Timeline scroll progress (matches live jet-elements jetTimeLine).
 * Fills .jet-timeline__line-progress and toggles .is--active on items while scrolling.
 */
(function ($) {
  if (!$ || !$.fn) return;

  function debounce(ms, fn) {
    var t;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  }

  function JetTimeline($wrap) {
    var $scrollRoot = $(window);
    var self = this;
    var $line = $wrap.find(".jet-timeline__line");
    var $progress = $line.find(".jet-timeline__line-progress");
    var $items = $wrap.find(".jet-timeline-item");
    var $points = $wrap.find(".timeline-item__point");
    var lastScroll = -1;
    var queued = false;

    self.onScroll = function () {
      self.updateFrame();
      self.animateCards();
    };

    self.onResize = function () {
      self.updateFrame();
    };

    self.updateWindow = function () {
      queued = false;
      if (!$items.length || !$points.length) return;

      var $first = $items.first();
      var $last = $items.last();
      var firstPointTop = $first.find(".timeline-item__point").offset().top - $first.offset().top;
      var lastPointBottom =
        $wrap.offset().top + $wrap.outerHeight() - $last.find(".timeline-item__point").offset().top;

      $line.css({
        top: firstPointTop,
        bottom: lastPointBottom,
      });

      var scrollTop = $scrollRoot.scrollTop();
      if (lastScroll !== scrollTop) {
        lastScroll = scrollTop;
        self.updateProgress();
      }
    };

    self.updateProgress = function () {
      var scrollTop = $scrollRoot.scrollTop();
      var mid = scrollTop + window.innerHeight / 2;
      var lastPointTop = $items.last().find(".timeline-item__point").offset().top;
      var progressTop = $progress.offset().top;
      var height = mid - progressTop;

      if (lastPointTop <= mid) {
        height = lastPointTop - progressTop;
      }
      if (height < 0) height = 0;
      $progress.css({ height: height + "px" });

      $items.each(function () {
        var $item = $(this);
        var pointTop = $item.find(".timeline-item__point").offset().top;
        if (pointTop < scrollTop + 0.5 * window.innerHeight) {
          $item.addClass("is--active");
        } else {
          $item.removeClass("is--active");
        }
      });
    };

    self.updateFrame = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(self.updateWindow);
    };

    self.animateCards = function () {
      var scrollTop = $scrollRoot.scrollTop();
      var showLine = scrollTop + 0.9 * window.innerHeight;
      $items.each(function () {
        var $item = $(this);
        if ($item.offset().top <= showLine && $item.hasClass("jet-timeline-item--animated")) {
          $item.addClass("is--show");
        }
      });
    };

    self.init = function () {
      $(document).ready(self.onScroll);
      $scrollRoot.on("scroll.jetTimeline", self.onScroll);
      $(window).on("resize.jetTimeline orientationchange.jetTimeline", debounce(50, self.onResize));
      self.onScroll();
    };
  }

  function boot() {
    $(".jet-timeline").each(function () {
      var $el = $(this);
      if ($el.data("spJetTimeline")) return;
      $el.data("spJetTimeline", true);
      new JetTimeline($el).init();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window.jQuery);
