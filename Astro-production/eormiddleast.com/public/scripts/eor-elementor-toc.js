/**
 * Fallback TOC for Elementor Pro widget when webpack chunk 786 is missing.
 * Builds the list from headings in data-settings.container (e.g. .post-col).
 */
(function () {
  function slugify(text) {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
  }

  function parseSettings(el) {
    const raw = el.getAttribute("data-settings") || "{}";
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  function ensureId(heading, index) {
    if (heading.id) return heading.id;
    const base = slugify(heading.textContent) || `section-${index + 1}`;
    let id = base;
    let n = 2;
    while (document.getElementById(id)) {
      id = `${base}-${n++}`;
    }
    heading.id = id;
    return id;
  }

  function buildList(headings, hierarchical, listTag) {
    if (!hierarchical) {
      const list = document.createElement(listTag);
      list.className = "elementor-toc__list-wrapper";
      headings.forEach((h, i) => {
        const id = ensureId(h, i);
        const li = document.createElement("li");
        li.className = "elementor-toc__list-item";
        const wrap = document.createElement("div");
        wrap.className = "elementor-toc__list-item-text-wrapper";
        const a = document.createElement("a");
        a.href = `#${id}`;
        a.className = "elementor-toc__list-item-text elementor-toc__top-level";
        a.textContent = (h.textContent || "").trim();
        wrap.appendChild(a);
        li.appendChild(wrap);
        list.appendChild(li);
      });
      return list;
    }

    // Nested by heading level
    const root = document.createElement(listTag);
    root.className = "elementor-toc__list-wrapper";
    const stack = [{ level: 0, list: root, li: null }];

    headings.forEach((h, i) => {
      const level = Number(h.tagName.slice(1));
      const id = ensureId(h, i);
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      const parent = stack[stack.length - 1];
      const li = document.createElement("li");
      li.className = "elementor-toc__list-item";
      const wrap = document.createElement("div");
      wrap.className = "elementor-toc__list-item-text-wrapper";
      const a = document.createElement("a");
      a.href = `#${id}`;
      a.className =
        "elementor-toc__list-item-text" +
        (parent.level === 0 ? " elementor-toc__top-level" : "");
      a.textContent = (h.textContent || "").trim();
      wrap.appendChild(a);
      li.appendChild(wrap);
      parent.list.appendChild(li);

      const childList = document.createElement(listTag);
      childList.className = "elementor-toc__list-wrapper";
      li.appendChild(childList);
      stack.push({ level, list: childList, li });
    });

    // Drop empty nested lists
    root.querySelectorAll(".elementor-toc__list-wrapper").forEach((ul) => {
      if (!ul.children.length && ul !== root) ul.remove();
    });
    return root;
  }

  function hydrate(widget) {
    const body = widget.querySelector(".elementor-toc__body");
    if (!body) return;
    if (widget.querySelector(".elementor-toc__list-item")) return;
    if (!widget.querySelector(".elementor-toc__spinner") && body.childElementCount > 0) {
      return;
    }

    const settings = parseSettings(widget);
    const tags = (settings.headings_by_tags || ["h2", "h3"]).join(",");
    const containerSel = settings.container || "";
    const container = containerSel
      ? document.querySelector(containerSel)
      : widget.closest(".elementor") || document;
    if (!container) {
      body.textContent = settings.no_headings_message || "No headings were found on this page.";
      return;
    }

    const headings = [...container.querySelectorAll(tags)].filter((h) => {
      if (h.closest(".elementor-toc__header-title")) return false;
      if (h.closest(".elementor-widget-table-of-contents")) return false;
      return (h.textContent || "").trim().length > 0;
    });

    if (!headings.length) {
      body.textContent = settings.no_headings_message || "No headings were found on this page.";
      return;
    }

    const listTag = settings.marker_view === "numbers" ? "ol" : "ul";
    const list = buildList(headings, settings.hierarchical_view === "yes", listTag);
    body.innerHTML = "";
    body.appendChild(list);
    widget.classList.add("eor-toc-hydrated");
  }

  function run() {
    document
      .querySelectorAll(".elementor-widget-table-of-contents")
      .forEach((widget) => {
        try {
          hydrate(widget);
        } catch (e) {
          console.warn("[eor-toc]", e);
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(run, 50));
  } else {
    setTimeout(run, 50);
  }
  // Retry once in case Elementor later fails mid-init
  setTimeout(run, 1200);
})();
