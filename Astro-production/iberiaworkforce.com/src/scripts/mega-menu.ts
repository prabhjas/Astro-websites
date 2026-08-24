/**
 * Behaviour for a header mega menu: a trigger in the navbar, a sheet anchored
 * beneath it, and a vertical rail of tabs selecting which pane the sheet shows.
 *
 * Shared by Services and Countries. They are the same object read from two
 * directions, so a second copy of this would be two copies to keep in step —
 * and the one behaviour neither could have alone is the part that matters most:
 * opening either closes the other.
 *
 * The panel is expected to be a descendant of `<header>`, so moving the pointer
 * from the trigger into the panel never leaves the element the close timer
 * watches.
 */

/** Must match the `.mega-panel` transition in `global.css`. */
const CLOSE_MS = 260;

/** Fired on `document` when any menu opens, so its siblings can stand down. */
const OPEN_EVENT = "megamenu:open";

export function initMegaMenu(triggerId: string, panelId: string) {
  const panel = document.getElementById(panelId);
  const trigger = document.getElementById(triggerId);
  const header = trigger?.closest("header");
  if (!panel || !trigger || !header) return;

  const tabs = Array.from(
    panel.querySelectorAll<HTMLButtonElement>("[data-menu-tab]"),
  );
  const panes = Array.from(
    panel.querySelectorAll<HTMLElement>("[data-menu-pane]"),
  );
  const marker = panel.querySelector<HTMLElement>("[data-menu-marker]");

  /*
    Hover-to-open is only offered to devices that actually hover. On a touch
    screen `mouseenter` fires on tap and would open the menu on the way to
    somewhere else, so those devices get click-only.
  */
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  /*
    Two timers, deliberately not one. `hoverTimer` is intent — the pause before
    a hover opens or closes — and any pointer entering the header cancels it.
    `hideTimer` puts `hidden` back once the close transition has run, and must
    survive that cancellation: sharing one variable left a closed, invisible
    sheet lying over the page swallowing clicks when you re-entered mid-close.
  */
  let hoverTimer: number | undefined;
  let hideTimer: number | undefined;

  const clearHover = () => {
    if (hoverTimer !== undefined) window.clearTimeout(hoverTimer);
    hoverTimer = undefined;
  };

  const isOpen = () => trigger.getAttribute("aria-expanded") === "true";

  /*
    The sheet spans the page, so its position is CSS. What is not is where it
    grows from: the origin is written to the trigger's own centre, so opening
    Countries scales out of Countries rather than out of the middle of the page.
    Measured against the header because the panel is absolutely positioned
    within it, and re-read on resize because the trigger moves with the layout.
  */
  const place = () => {
    const t = trigger.getBoundingClientRect();
    const h = header.getBoundingClientRect();
    panel.style.transformOrigin = `${t.left - h.left + t.width / 2}px top`;
  };

  /*
    The marker is a hairline segment travelling down the divider between the two
    columns, aligned with the active row. Height is written once and only
    `translateY` animates, so the travel stays on the compositor.
  */
  const placeMarker = (tab: HTMLElement, animate: boolean) => {
    if (!marker) return;
    const inset = 8;
    const height = tab.offsetHeight - inset * 2;
    if (height <= 0) return;
    if (!animate) marker.style.transition = "none";
    marker.style.height = `${height}px`;
    marker.style.transform = `translateY(${tab.offsetTop + inset}px)`;
    marker.style.opacity = "1";
    if (!animate) {
      // Flush, then hand the transition back — otherwise the first hover after
      // opening inherits the suppression and the marker jumps.
      void marker.offsetHeight;
      marker.style.transition = "";
    }
  };

  /*
    Hold the sheet at the height of its tallest pane, so switching tabs does not
    resize it under the pointer — the one thing that should move in this menu is
    the marker. Measured rather than computed from row counts, because a
    description that wraps changes the answer.

    Runs once per open while the panel is visible. The panes are display:none,
    so each is briefly unhidden to be measured and put back; the active pane is
    never toggled, so its cross-fade is untouched.
  */
  const sizePanes = () => {
    const container = panel.querySelector<HTMLElement>("[data-menu-panes]");
    if (!container) return;
    container.style.minHeight = "";
    let tallest = 0;
    panes.forEach((pane) => {
      const wasHidden = pane.hidden;
      if (wasHidden) pane.hidden = false;
      tallest = Math.max(tallest, pane.offsetHeight);
      if (wasHidden) pane.hidden = true;
    });
    container.style.minHeight = `${tallest}px`;
  };

  const activeTab = () =>
    tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0];

  const open = () => {
    clearHover();
    // A re-open inside the close transition must cancel the pending hide, or
    // it lands a few frames later and blanks the sheet that just reopened.
    if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    hideTimer = undefined;
    if (isOpen()) return;
    // Both sheets are absolutely positioned under the same header bar, so only
    // one may be open at a time. Announce first, then open.
    document.dispatchEvent(
      new CustomEvent(OPEN_EVENT, { detail: { panelId } }),
    );
    trigger.setAttribute("aria-expanded", "true");
    panel.classList.remove("hidden");
    sizePanes();
    place();
    // The marker cannot be measured while the panel is display:none, so it is
    // positioned here without animation — it should be in place on arrival,
    // not slide in from the top edge.
    const current = activeTab();
    if (current) placeMarker(current, false);
    // Next frame, so the transition has a start value to animate from.
    requestAnimationFrame(() => panel.classList.add("is-open"));
  };

  const close = () => {
    clearHover();
    if (!isOpen()) return;
    trigger.setAttribute("aria-expanded", "false");
    panel.classList.remove("is-open");
    const done = () => {
      panel.classList.add("hidden");
      hideTimer = undefined;
    };
    if (still.matches) {
      done();
    } else {
      hideTimer = window.setTimeout(done, CLOSE_MS);
    }
  };

  const select = (key: string) => {
    tabs.forEach((tab) => {
      const on = tab.dataset.menuTab === key;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on) placeMarker(tab, true);
    });
    panes.forEach((pane) => {
      pane.hidden = pane.dataset.menuPane !== key;
    });
  };

  document.addEventListener(OPEN_EVENT, (event) => {
    const detail = (event as CustomEvent<{ panelId: string }>).detail;
    if (detail?.panelId === panelId) return;
    close();
  });

  window.addEventListener("resize", () => {
    if (isOpen()) place();
  });

  trigger.addEventListener("click", () => (isOpen() ? close() : open()));

  if (canHover.matches) {
    trigger.addEventListener("mouseenter", () => {
      clearHover();
      hoverTimer = window.setTimeout(open, 100);
    });
    // The panel is a child of <header>, so leaving the header covers the
    // trigger, the gap and the panel in one listener.
    header.addEventListener("mouseleave", () => {
      clearHover();
      hoverTimer = window.setTimeout(close, 220);
    });
    header.addEventListener("mouseenter", clearHover);
    panel.addEventListener("mouseenter", clearHover);

    // Sliding sideways onto another nav item — a plain link, or the other
    // menu's trigger — should dismiss this one immediately. The other trigger
    // reopens through its own `open()`, which is what closes us properly.
    header
      .querySelectorAll<HTMLElement>("[data-nav-link], [data-menu-trigger]")
      .forEach((el) => {
        if (el === trigger) return;
        el.addEventListener("mouseenter", close);
      });
  }

  tabs.forEach((tab, i) => {
    const key = tab.dataset.menuTab!;
    tab.addEventListener("mouseenter", () => select(key));
    tab.addEventListener("focus", () => select(key));
    tab.addEventListener("click", () => select(key));

    tab.addEventListener("keydown", (event) => {
      const step =
        event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      tabs[(i + step + tabs.length) % tabs.length].focus();
    });
  });

  // ArrowDown from the trigger opens and moves into the rail.
  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    open();
    tabs[0]?.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isOpen()) return;
    close();
    trigger.focus();
  });

  // Tabbing or clicking clean out of the header closes it.
  header.addEventListener("focusout", (event) => {
    if (!isOpen()) return;
    const next = (event as FocusEvent).relatedTarget as Node | null;
    if (next && header.contains(next)) return;
    close();
  });

  document.addEventListener("click", (event) => {
    if (!isOpen()) return;
    if (header.contains(event.target as Node)) return;
    close();
  });
}
