/**
 * Clean mobile drawer for EOR Elementor header.
 * Hides Elementor dropdown on ≤1024px and builds a simple accordion menu.
 */
(() => {
  const MQ = "(max-width: 1024px)";
  const DRAWER_ID = "eor-mobile-drawer";
  const BACKDROP_ID = "eor-mobile-backdrop";

  function isMobile() {
    return window.matchMedia(MQ).matches;
  }

  function headerRoot() {
    return document.querySelector("[data-sp-elementor-header]");
  }

  function getToggle(root) {
    return root?.querySelector(".elementor-menu-toggle") || null;
  }

  function getSourceMenu(root) {
    return (
      root?.querySelector("#menu-2-b0484de") ||
      root?.querySelector("nav.elementor-nav-menu--dropdown > .elementor-nav-menu") ||
      root?.querySelector("#menu-1-b0484de") ||
      null
    );
  }

  function syncHeaderOffset() {
    const root = headerRoot();
    if (!root) return;
    const bar =
      root.querySelector(".elementor-sticky--active") ||
      root.querySelector(".elementor-element-6f248928") ||
      root;
    const h = Math.max(56, Math.ceil(bar.getBoundingClientRect().height || 70));
    document.documentElement.style.setProperty("--eor-header-offset", `${h}px`);
  }

  function parseItems(ul) {
    if (!ul) return [];
    const items = [];
    ul.querySelectorAll(":scope > li.menu-item").forEach((li) => {
      const a = li.querySelector(":scope > a");
      if (!a) return;
      const label = (a.textContent || "").replace(/\s+/g, " ").trim();
      if (!label) return;
      const href = a.getAttribute("href") || "";
      const childUl = li.querySelector(":scope > .sub-menu");
      items.push({
        label,
        href: href && href !== "#" ? href : "",
        children: childUl ? parseItems(childUl) : [],
      });
    });
    return items;
  }

  function renderItems(items, depth = 0) {
    const ul = document.createElement("ul");
    ul.className = depth === 0 ? "eor-mnav" : "eor-mnav__sub";

    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "eor-mnav__item";

      const row = document.createElement("div");
      row.className = "eor-mnav__row";

      const link = document.createElement(item.href ? "a" : "button");
      link.className = "eor-mnav__link";
      if (item.href) {
        link.setAttribute("href", item.href);
      } else {
        link.type = "button";
      }
      link.textContent = item.label;
      row.appendChild(link);

      if (item.children?.length) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "eor-mnav__toggle";
        btn.setAttribute("aria-label", `Expand ${item.label}`);
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "+";
        row.appendChild(btn);

        const sub = renderItems(item.children, depth + 1);

        const toggleOpen = () => {
          const open = !li.classList.contains("is-open");
          // close siblings
          const parent = li.parentElement;
          if (parent) {
            parent.querySelectorAll(":scope > .eor-mnav__item.is-open").forEach((sib) => {
              if (sib === li) return;
              sib.classList.remove("is-open");
              const t = sib.querySelector(":scope > .eor-mnav__row > .eor-mnav__toggle");
              if (t) {
                t.textContent = "+";
                t.setAttribute("aria-expanded", "false");
              }
            });
          }
          li.classList.toggle("is-open", open);
          btn.textContent = open ? "−" : "+";
          btn.setAttribute("aria-expanded", String(open));
        };

        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleOpen();
        });

        if (!item.href) {
          link.addEventListener("click", (e) => {
            e.preventDefault();
            toggleOpen();
          });
        }

        li.appendChild(row);
        li.appendChild(sub);
      } else {
        li.appendChild(row);
      }

      ul.appendChild(li);
    });

    return ul;
  }

    function ensureDrawer(items) {
    let drawer = document.getElementById(DRAWER_ID);
    if (drawer && drawer.dataset.ready === "1") return drawer;
    if (!drawer) {
      drawer = document.createElement("nav");
      drawer.id = DRAWER_ID;
      drawer.setAttribute("aria-label", "Mobile menu");
      drawer.setAttribute("hidden", "");
      drawer.setAttribute("aria-hidden", "true");
      document.body.appendChild(drawer);
    }
    drawer.innerHTML = "";
    drawer.appendChild(renderItems(items));

    const cta = document.createElement("a");
    cta.className = "eor-mnav__cta";
    cta.href = "/schedule-a-call/";
    cta.textContent = "Get A Quote";
    drawer.appendChild(cta);

    drawer.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || a.classList.contains("eor-mnav__toggle")) return;
      window.setTimeout(closeMenu, 10);
    });
    drawer.dataset.ready = "1";
    return drawer;
  }

  function ensureBackdrop() {
    let el = document.getElementById(BACKDROP_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = BACKDROP_ID;
    el.setAttribute("hidden", "");
    document.body.appendChild(el);
    el.addEventListener("click", closeMenu);
    return el;
  }

  function setOpen(next) {
    if (!isMobile() && next) return;
    const root = headerRoot();
    const toggle = getToggle(root);
    syncHeaderOffset();
    ensureBackdrop();

    if (toggle) {
      toggle.classList.toggle("elementor-active", next);
      toggle.setAttribute("aria-expanded", String(next));
    }

    document.documentElement.classList.toggle("eor-mobile-menu-open", next);
    document.body.classList.toggle("eor-mobile-menu-open", next);

    const drawer = document.getElementById(DRAWER_ID);
    const backdrop = document.getElementById(BACKDROP_ID);
    if (drawer) {
      drawer.setAttribute("aria-hidden", String(!next));
      if (next) drawer.removeAttribute("hidden");
      else drawer.setAttribute("hidden", "");
    }
    if (backdrop) {
      if (next) backdrop.removeAttribute("hidden");
      else backdrop.setAttribute("hidden", "");
    }
  }

  function closeMenu() {
    setOpen(false);
  }

  function openMenu() {
    setOpen(true);
  }

  function boot() {
    const root = headerRoot();
    if (!root) return;
    const toggle = getToggle(root);
    const source = getSourceMenu(root);
    if (!toggle || !source) return;

    const items = parseItems(source);
    if (!items.length) return;

    ensureDrawer(items);
    ensureBackdrop();
    syncHeaderOffset();

    if (toggle.dataset.eorMobileBound === "1") return;
    toggle.dataset.eorMobileBound = "1";

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!isMobile()) return;
      const next = toggle.getAttribute("aria-expanded") !== "true";
      setOpen(next);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    window.addEventListener(
      "resize",
      () => {
        syncHeaderOffset();
        if (!isMobile()) closeMenu();
      },
      { passive: true },
    );

    window.addEventListener("scroll", syncHeaderOffset, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", () => {
    boot();
    syncHeaderOffset();
  });
})();

/** Connect FM Elementor mega-menu (e-n-menu) — Services accordion on mobile */
(() => {
  const MQ = "(max-width: 1024px)";
  function isMobile() {
    return window.matchMedia(MQ).matches;
  }
  function setLayout(nav) {
    if (!nav) return;
    if (isMobile()) nav.setAttribute("data-layout", "dropdown");
    else nav.removeAttribute("data-layout");
  }
  function closeItem(li) {
    const btn = li.querySelector(":scope > .e-n-menu-title .e-n-menu-dropdown-icon");
    const content = li.querySelector(":scope > .e-n-menu-content > .e-con");
    const title = li.querySelector(":scope > .e-n-menu-title");
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (content) content.classList.remove("e-active");
    if (title) title.classList.remove("e-current");
    li.classList.remove("is-open");
  }
  function openItem(li) {
    const btn = li.querySelector(":scope > .e-n-menu-title .e-n-menu-dropdown-icon");
    const content = li.querySelector(":scope > .e-n-menu-content > .e-con");
    const title = li.querySelector(":scope > .e-n-menu-title");
    if (btn) btn.setAttribute("aria-expanded", "true");
    if (content) content.classList.add("e-active");
    if (title) title.classList.add("e-current");
    li.classList.add("is-open");
  }
  function toggleItem(li) {
    if (li.classList.contains("is-open")) closeItem(li);
    else {
      const parent = li.parentElement;
      if (parent) {
        parent.querySelectorAll(":scope > .e-n-menu-item.is-open").forEach((sib) => {
          if (sib !== li) closeItem(sib);
        });
      }
      openItem(li);
    }
  }
  function bind(widget) {
    if (widget.dataset.astroEnMenuBound === "1") return;
    widget.dataset.astroEnMenuBound = "1";
    const nav = widget.querySelector(".e-n-menu");
    setLayout(nav);

    const toggle = widget.querySelector(".e-n-menu-toggle");
    if (toggle && toggle.dataset.astroEnToggleBound !== "1") {
      toggle.dataset.astroEnToggleBound = "1";
      toggle.addEventListener("click", () => {
        if (!isMobile()) return;
        // Let Elementor also handle if present; ensure layout stays dropdown
        setLayout(nav);
        if (toggle.getAttribute("aria-expanded") !== "true") {
          widget.querySelectorAll(".e-n-menu-item.is-open").forEach(closeItem);
        }
      });
    }

    widget.querySelectorAll(".e-n-menu-item").forEach((li) => {
      const btn = li.querySelector(":scope > .e-n-menu-title .e-n-menu-dropdown-icon");
      const titleClick = li.querySelector(
        ":scope > .e-n-menu-title .e-n-menu-title-container:not(a)",
      );
      if (!btn) return;
      const onToggle = (e) => {
        if (!isMobile()) return;
        e.preventDefault();
        e.stopPropagation();
        toggleItem(li);
      };
      btn.addEventListener("click", onToggle);
      if (titleClick) titleClick.addEventListener("click", onToggle);
    });
  }
  function init() {
    document.querySelectorAll(".elementor-widget-n-menu").forEach(bind);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.addEventListener("load", init);
  window.addEventListener("resize", () => {
    document.querySelectorAll(".elementor-widget-n-menu .e-n-menu").forEach(setLayout);
  });
})();
