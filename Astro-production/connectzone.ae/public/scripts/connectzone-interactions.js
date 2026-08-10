/**
 * Connect Zone — lazy images, Jet FAQ, Elementor tabs, Jet Mega Menu, Elementor nudges.
 */
(() => {
  function unwrapLazyImages(root = document) {
    root.querySelectorAll("img[data-lazy-src], img[data-src]").forEach((img) => {
      const lazy = img.getAttribute("data-lazy-src") || img.getAttribute("data-src");
      const src = img.getAttribute("src") || "";
      const isPlaceholder =
        !src || src.startsWith("data:image/svg") || src.includes("placeholder");
      if (lazy && isPlaceholder) {
        img.setAttribute("src", lazy);
        img.removeAttribute("data-lazy-src");
        img.removeAttribute("data-src");
        img.classList.remove("lazyload", "rocket-lazyload");
      }
    });
  }

  function contentInnerHeight(content) {
    const inner = content.querySelector(".jet-toggle__content-inner");
    let h = inner ? inner.offsetHeight : content.scrollHeight;
    const cs = window.getComputedStyle(content);
    h += (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
    return h;
  }

  function closeToggle(toggle) {
    const control = toggle.querySelector(".jet-toggle__control");
    const content = toggle.querySelector(".jet-toggle__content");
    if (!content) return;
    content.style.height = `${content.offsetHeight || contentInnerHeight(content)}px`;
    void content.offsetHeight;
    toggle.classList.remove("active-toggle", "jet-toggle-active", "active");
    content.style.height = "0px";
    if (control) control.setAttribute("aria-expanded", "false");
  }

  function openToggle(toggle) {
    const control = toggle.querySelector(".jet-toggle__control");
    const content = toggle.querySelector(".jet-toggle__content");
    if (!content) return;
    toggle.classList.add("active-toggle");
    const h = contentInnerHeight(content);
    content.style.height = `${h}px`;
    if (control) control.setAttribute("aria-expanded", "true");
    window.setTimeout(() => {
      if (toggle.classList.contains("active-toggle")) content.style.height = "auto";
    }, 500);
  }

  function unbindJetAccordionHandlers(control) {
    const $ = window.jQuery;
    if (!$) return;
    try {
      $(control).off("click.jetAccordion");
      $(control).off(".jetAccordion");
    } catch {
      /* ignore */
    }
  }

  function bindJetFaq() {
    document.querySelectorAll(".jet-accordion__item.jet-toggle, .jet-accordion .jet-toggle, .faq-sec .jet-toggle").forEach((toggle) => {
      if (toggle.dataset.czFaqBound) {
        // Jet may re-bind after Elementor nudge — keep ours exclusive
        const control = toggle.querySelector(".jet-toggle__control, .jet-accordion__control");
        if (control) unbindJetAccordionHandlers(control);
        return;
      }
      const control =
        toggle.querySelector(".jet-toggle__control, .jet-toggle__button, .jet-toggle__label") ||
        toggle.querySelector(".jet-accordion__control");
      const content = toggle.querySelector(".jet-toggle__content, .jet-accordion__content");
      if (!control || !content) return;

      // Always own the click — Jet + our handler both firing opens then instantly closes
      unbindJetAccordionHandlers(control);
      toggle.dataset.czFaqBound = "1";

      const onToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        unbindJetAccordionHandlers(control);

        const willOpen = !toggle.classList.contains("active-toggle");
        const parent = toggle.parentElement;
        if (willOpen && parent) {
          [...parent.children].forEach((sib) => {
            if (
              sib !== toggle &&
              sib.classList &&
              (sib.classList.contains("jet-toggle") || sib.classList.contains("jet-accordion__item")) &&
              sib.classList.contains("active-toggle")
            ) {
              closeToggle(sib);
            }
          });
        }
        if (willOpen) openToggle(toggle);
        else closeToggle(toggle);
      };

      // Capture phase so we win over Jet / Elementor bubble handlers
      control.addEventListener("click", onToggle, true);
      control.addEventListener(
        "keydown",
        (e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          onToggle(e);
        },
        true,
      );
    });
  }

  /** Advantages section = Elementor tabs (content is display:none until .elementor-active). */
  function activateTab(widget, tabNum) {
    const titles = widget.querySelectorAll(".elementor-tab-title");
    const contents = widget.querySelectorAll(".elementor-tab-content");
    titles.forEach((title) => {
      const n = title.getAttribute("data-tab");
      const on = n === String(tabNum);
      title.classList.toggle("elementor-active", on);
      title.setAttribute("aria-selected", on ? "true" : "false");
      title.setAttribute("aria-expanded", on ? "true" : "false");
      title.setAttribute("tabindex", on ? "0" : "-1");
    });
    contents.forEach((content) => {
      const n = content.getAttribute("data-tab");
      const on = n === String(tabNum);
      content.classList.toggle("elementor-active", on);
      content.hidden = !on;
      content.style.display = on ? "block" : "none";
    });
  }

  function bindElementorTabs() {
    document.querySelectorAll(".elementor-widget-tabs .elementor-tabs").forEach((tabs) => {
      if (tabs.dataset.czTabsBound) return;
      tabs.dataset.czTabsBound = "1";
      const widget = tabs.closest(".elementor-widget-tabs") || tabs;

      // Open first tab if none active / all hidden
      const anyActive = tabs.querySelector(".elementor-tab-content.elementor-active");
      const firstTitle = tabs.querySelector(".elementor-tab-title[data-tab]");
      if (!anyActive && firstTitle) {
        activateTab(widget, firstTitle.getAttribute("data-tab") || "1");
      } else if (anyActive) {
        anyActive.style.display = "block";
        anyActive.hidden = false;
      }

      tabs.querySelectorAll(".elementor-tab-title").forEach((title) => {
        title.addEventListener("click", (e) => {
          e.preventDefault();
          const tabNum = title.getAttribute("data-tab");
          if (tabNum) activateTab(widget, tabNum);
        });
        title.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          title.click();
        });
      });
    });
  }

  function bindFooterEmail() {
    const el = document.getElementById("safe-email");
    if (!el || el.dataset.czEmailBound) return;
    el.dataset.czEmailBound = "1";
    const email = "info@connectzone.ae";
    el.innerHTML = `<a href="mailto:${email}" style="color: white !important; text-decoration: underline;">${email}</a>`;
  }

  function parseDataSettings(el) {
    const $ = window.jQuery;
    if ($) {
      try {
        const fromJq = $(el).data("settings");
        if (fromJq && typeof fromJq === "object") return fromJq;
      } catch {
        /* ignore */
      }
    }
    const raw = el.getAttribute("data-settings");
    if (!raw) return null;
    try {
      return JSON.parse(raw.replace(/&quot;/g, '"'));
    } catch {
      return null;
    }
  }

  function initJetMegaMenuDirect() {
    const $ = window.jQuery;
    if (!$?.fn?.JetMegaMenu) return false;
    let inited = false;
    $(".cz-site-header .jet-mega-menu--location-elementor, .cz-site-header .jet-mega-menu").each(
      function initMenu() {
        const $menu = $(this);
        if ($menu.data("czJetMegaInit") || $menu.data("JetMegaMenu")) {
          inited = true;
          return;
        }
        const settings = parseDataSettings(this) || {};
        $menu.JetMegaMenu({
          menuId: settings.menuId || "4",
          menuUniqId: settings.menuUniqId || `cz-${Date.now()}`,
          rollUp: settings.rollUp || false,
          layout: settings.layout || "horizontal",
          subEvent: settings.subEvent || "hover",
          subCloseBehavior: settings.subCloseBehavior || "mouseleave",
          mouseLeaveDelay: settings.mouseLeaveDelay || 500,
          subTrigger: settings.subTrigger || "item",
          breakpoint: settings.breakpoint || 768,
          megaWidthType: settings.megaWidthType || "container",
          megaWidthSelector: settings.megaWidthSelector || "",
          megaAjaxLoad: settings.megaAjaxLoad || false,
          signatures: settings.signatures || [],
          classes: {
            instance: "jet-mega-menu",
            menuContainer: "jet-mega-menu-container",
            menuList: "jet-mega-menu-list",
            menuItem: "jet-mega-menu-item",
            menuItemLink: "jet-mega-menu-item__link",
            subMenuContainer: "jet-mega-menu-sub-menu",
            subMenuList: "jet-mega-menu-sub-menu__list",
            megaContainer: "jet-mega-menu-mega-container",
          },
        });
        $menu.data("czJetMegaInit", true);
        inited = true;
      },
    );
    return inited;
  }

  /** Hover fallback when JetMegaMenu plugin fails to attach. */
  function bindMegaMenuFallback() {
    document.querySelectorAll(".cz-site-header .jet-mega-menu").forEach((menu) => {
      if (menu.classList.contains("jet-mega-menu--inited")) return;
      if (menu.dataset.czMegaFallback) return;
      menu.dataset.czMegaFallback = "1";

      menu.querySelectorAll(".jet-mega-menu-item-has-children").forEach((item) => {
        const inner = item.querySelector(":scope > .jet-mega-menu-item__inner");
        if (!inner) return;

        const open = () => {
          const parentList = item.parentElement;
          if (parentList) {
            parentList.querySelectorAll(":scope > .jet-mega-menu-item--hover").forEach((sib) => {
              if (sib !== item) sib.classList.remove("jet-mega-menu-item--hover");
            });
          }
          item.classList.add("jet-mega-menu-item--hover");
          item
            .querySelectorAll(':scope > .jet-mega-menu-item__inner [aria-haspopup="true"]')
            .forEach((el) => el.setAttribute("aria-expanded", "true"));
        };

        const close = () => {
          item.classList.remove("jet-mega-menu-item--hover");
          item.querySelectorAll(".jet-mega-menu-item--hover").forEach((c) => {
            c.classList.remove("jet-mega-menu-item--hover");
          });
          item
            .querySelectorAll('[aria-haspopup="true"]')
            .forEach((el) => el.setAttribute("aria-expanded", "false"));
        };

        inner.addEventListener("mouseenter", open);
        item.addEventListener("mouseleave", (e) => {
          if (item.contains(e.relatedTarget)) return;
          close();
        });
        inner.addEventListener("click", (e) => {
          // Allow nested dropdown toggle on click for touch / nested items
          if (!item.classList.contains("jet-mega-menu-item--top-level")) {
            e.preventDefault();
            if (item.classList.contains("jet-mega-menu-item--hover")) close();
            else open();
          }
        });
      });

      menu.classList.add("jet-mega-menu--inited");
    });
  }

  function ensureMegaMenu() {
    const ok = initJetMegaMenuDirect();
    if (!ok) bindMegaMenuFallback();
    window.setTimeout(() => {
      const stillBroken = [...document.querySelectorAll(".cz-site-header .jet-mega-menu")].some(
        (m) => !m.classList.contains("jet-mega-menu--inited"),
      );
      if (stillBroken) bindMegaMenuFallback();
    }, 400);
  }

  let elementorNudged = false;
  function nudgeElementor() {
    // Only nudge once — repeated elementorFrontend.init() re-inits Jet Accordion
    // and collapses FAQs the user just opened.
    if (!elementorNudged) {
      elementorNudged = true;
      try {
        if (window.elementorFrontend?.init) window.elementorFrontend.init();
      } catch {
        /* ignore */
      }
      if (window.jQuery) window.jQuery(window).trigger("elementor/frontend/init");
    }
    ensureMegaMenu();
    // Re-claim FAQ after Jet may have bound during the nudge
    bindJetFaq();
  }

  function run() {
    unwrapLazyImages();
    bindJetFaq();
    bindElementorTabs();
    bindFooterEmail();
    nudgeElementor();
  }

  run();
  document.addEventListener("DOMContentLoaded", run);
  window.addEventListener("load", () => {
    run();
    setTimeout(run, 400);
    setTimeout(() => {
      unwrapLazyImages();
      bindJetFaq();
      ensureMegaMenu();
    }, 1200);
  });
})();
