#!/usr/bin/env python3
"""Semantic heading tags ONLY for Connect Resources.

- Change <p> → <h2>/<h3>/<h4> (or div.w-text → h1/h2) for hierarchy.
- Move existing us_custom_* design-token class from the text column onto the
  heading so EXISTING page CSS continues to style the text (no new CSS).
- Do not modify CSS files, layout, or visual tokens.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES_PATH = ROOT / "src/data/pages.json"

SKIP_PATHS = {
    "/search/",
    "/footer-test/",
    "/authors/",
    "/press-release/",
    "/newsletter/",
    "/aaron-portero/",
    "/ejari-dewa/",
    "/press/",
}
SKIP_PREFIXES = ("/employer-of-record-lp", "/landing-page-", "/lp-")
EXACT_TAG = {
    "faqs": "h4",
    "faq": "h4",
    "other solutions": "h3",
    "we also offer": "h2",
}
TARGET_PATHS = {
    "/payroll/",
    "/staff-outsourcing/",
    "/hr-services/contract-staffing-dubai/",
    "/outsourcing/",
    "/e-services/",
    "/it-outsourcing/",
    "/relocation-employee-dubai/",
    "/rpo-service/",
    "/meet-our-team/",
    "/csr-activity/",
    "/contact/",
    "/corporate-pro/",
    "/best-hr-consultancy-in-dubai/",
    "/recruitment-agency-in-abu-dhabi/",
    "/schedule-a-call/",
    "/working-remotely-abroad-for-uk-company/",
    "/hr-services/",
    "/eor-transfer/",
    "/professional-employer-organization-dubai/",
    "/hire-freelancer/",
    "/freelance-journey/",
    "/saudi-arabia/",
}


def load_css_meta(page: dict) -> dict[str, dict]:
    meta: dict[str, dict] = {}
    for href in page.get("pageCss") or []:
        if "page-design" not in href:
            continue
        path = ROOT / "public" / href.lstrip("/")
        if not path.exists():
            continue
        css = path.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r"\.us_custom_([a-f0-9]+)\{([^}]+)\}", css):
            props = m.group(2)
            fs = re.search(r"font-size:([^!;]+)", props)
            fw = re.search(r"font-weight:([^!;]+)", props)
            fsn = float(re.search(r"([\d.]+)", fs.group(1)).group(1)) if fs and re.search(r"([\d.]+)", fs.group(1)) else None
            fwn = None
            if fw:
                raw = fw.group(1).strip().lower()
                if raw.isdigit():
                    fwn = int(raw)
                elif raw == "bold":
                    fwn = 700
                elif "semi" in raw:
                    fwn = 600
            meta[m.group(1)] = {"fontSize": fsn, "fontWeight": fwn}
    return meta


def plain_text(html_chunk: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html_chunk)
    text = (
        text.replace("&#8217;", "'")
        .replace("&#8211;", "–")
        .replace("&amp;", "&")
        .replace("&nbsp;", " ")
    )
    return re.sub(r"\s+", " ", text).strip()


def choose_tag(text: str, font_size: float | None, font_weight: int | None) -> str | None:
    key = text.strip().lower().rstrip(".")
    if key in EXACT_TAG:
        return EXACT_TAG[key]
    low = text.lower()
    if low.startswith("fill out the form") or low.startswith("speak with our"):
        return None
    if font_weight is not None and font_weight < 600:
        return None
    if font_size is not None and font_size <= 16:
        return None
    if font_size is not None and font_size >= 28 and (font_weight or 0) >= 600:
        return "h2"
    if (
        font_size is not None
        and font_size >= 18
        and (font_weight or 0) >= 600
        and len(text) <= 80
        and not text.endswith((".", "!", "?"))
    ):
        return "h3"
    if font_size is not None and 20 <= font_size < 28 and (font_weight or 0) >= 700 and len(text) <= 100:
        return "h2"
    return None


# Captures column with optional us_custom on the column itself
COLUMN_RE = re.compile(
    r'<div class="(wpb_text_column)(\s[^"]*)?"([^>]*)>\s*'
    r'<div class="wpb_wrapper">(.*?)</div>\s*</div>',
    re.S,
)


def upgrade_columns(html: str, css_meta: dict[str, dict]) -> tuple[str, int]:
    h1m = re.search(r"<h1\b[^>]*>.*?</h1>", html, flags=re.S | re.I)
    h1_end = h1m.end() if h1m else 0
    changes = 0

    def repl(m: re.Match) -> str:
        nonlocal changes
        if m.start() < h1_end:
            return m.group(0)

        base = m.group(1)  # wpb_text_column
        class_rest = m.group(2) or ""
        attrs = m.group(3) or ""
        inner = m.group(4)

        if len(re.findall(r"<p(\s[^>]*)?>", inner, flags=re.I)) != 1:
            return m.group(0)
        if re.search(r"<h[1-6]\b", inner, flags=re.I):
            return m.group(0)

        text = plain_text(inner)
        if not (4 <= len(text) <= 160):
            return m.group(0)

        full_classes = (base + class_rest).strip()
        us = re.search(r"us_custom_([a-f0-9]+)", full_classes)
        if not us:
            return m.group(0)
        cls_id = us.group(1)
        meta = css_meta.get(cls_id, {})
        tag = choose_tag(text, meta.get("fontSize"), meta.get("fontWeight"))
        if not tag:
            return m.group(0)

        # Strip us_custom_* from column; keep other column classes
        new_col_classes = re.sub(r"\s*us_custom_[a-f0-9]+", "", full_classes).strip()
        new_col_classes = re.sub(r"\s+", " ", new_col_classes)

        # Convert <p attrs>inner</p> → <hN class="us_custom_X" attrs>inner</hN>
        def p_to_h(pm: re.Match) -> str:
            p_attrs = pm.group(1) or ""
            # If p already has class, append us_custom; else add class
            if re.search(r"\bclass=", p_attrs, flags=re.I):
                p_attrs2 = re.sub(
                    r'class="([^"]*)"',
                    lambda cm: f'class="{cm.group(1)} us_custom_{cls_id}"',
                    p_attrs,
                    count=1,
                    flags=re.I,
                )
            else:
                p_attrs2 = f' class="us_custom_{cls_id}"' + p_attrs
            return f"<{tag}{p_attrs2}>"

        new_inner, n = re.subn(r"<p(\s[^>]*)?>", p_to_h, inner, count=1, flags=re.I)
        if n != 1:
            return m.group(0)
        new_inner, n2 = re.subn(r"</p\s*>", f"</{tag}>", new_inner, count=1, flags=re.I)
        if n2 != 1:
            return m.group(0)

        changes += 1
        return (
            f'<div class="{new_col_classes}"{attrs}>'
            f'<div class="wpb_wrapper">{new_inner}</div></div>'
        )

    # Simpler more reliable approach with original COLUMN pattern
    return upgrade_columns_v2(html, css_meta, h1_end)


def upgrade_columns_v2(html: str, css_meta: dict[str, dict], h1_end: int) -> tuple[str, int]:
    changes = 0
    pattern = re.compile(
        r'(<div class=")(wpb_text_column[^"]*)("[^>]*>\s*<div class="wpb_wrapper">)(.*?)(</div>\s*</div>)',
        re.S,
    )

    def repl(m: re.Match) -> str:
        nonlocal changes
        if m.start() < h1_end:
            return m.group(0)
        prefix, classes, mid, inner, suffix = m.groups()
        if len(re.findall(r"<p(\s[^>]*)?>", inner, flags=re.I)) != 1:
            return m.group(0)
        if re.search(r"<h[1-6]\b", inner, flags=re.I):
            return m.group(0)
        text = plain_text(inner)
        if not (4 <= len(text) <= 160):
            return m.group(0)
        us = re.search(r"us_custom_([a-f0-9]+)", classes)
        if not us:
            return m.group(0)
        cls_id = us.group(1)
        meta = css_meta.get(cls_id, {})
        tag = choose_tag(text, meta.get("fontSize"), meta.get("fontWeight"))
        if not tag:
            return m.group(0)

        new_classes = re.sub(r"\s*us_custom_[a-f0-9]+", "", classes).strip()
        new_classes = re.sub(r"\s+", " ", new_classes)

        def p_open(pm: re.Match) -> str:
            p_attrs = pm.group(1) or ""
            if re.search(r"\bclass=", p_attrs, flags=re.I):
                p_attrs2 = re.sub(
                    r'class="([^"]*)"',
                    lambda cm: f'class="us_custom_{cls_id} {cm.group(1)}"'.replace("  ", " "),
                    p_attrs,
                    count=1,
                    flags=re.I,
                )
            else:
                p_attrs2 = f' class="us_custom_{cls_id}"' + p_attrs
            return f"<{tag}{p_attrs2}>"

        new_inner, n = re.subn(r"<p(\s[^>]*)?>", p_open, inner, count=1, flags=re.I)
        if n != 1:
            return m.group(0)
        new_inner, n2 = re.subn(r"</p\s*>", f"</{tag}>", new_inner, count=1, flags=re.I)
        if n2 != 1:
            return m.group(0)

        changes += 1
        return f"{prefix}{new_classes}{mid}{new_inner}{suffix}"

    return pattern.sub(repl, html), changes


def upgrade_w_text(html: str) -> tuple[str, int]:
    """Author/contact: change element tag only; keep all classes on the same node."""
    changes = 0

    # Name / primary title token → h1 (only if not already h1)
    def name_repl(m: re.Match) -> str:
        nonlocal changes
        if m.group(0).lower().startswith("<h1"):
            return m.group(0)
        changes += 1
        open_tag = m.group(1).replace("<div", "<h1", 1)
        return open_tag + m.group(2) + "</h1>"

    html2, n = re.subn(
        r'(<div class="w-text us_custom_b10bccfd has_text_color">)(<span class="w-text-h">.*?</span>)</div>',
        name_repl,
        html,
        count=1,
        flags=re.S,
    )
    changes += 0  # counted in repl
    html = html2

    # Articles by → h2
    def articles_repl(m: re.Match) -> str:
        nonlocal changes
        if m.group(0).lower().startswith("<h2"):
            return m.group(0)
        changes += 1
        return m.group(1).replace("<div", "<h2", 1) + m.group(2) + "</h2>"

    html, _ = re.subn(
        r'(<div class="w-text us_custom_db229ddf has_text_color">)(<span class="w-text-h">.*?</span>)</div>',
        articles_repl,
        html,
        count=1,
        flags=re.S,
    )

    # Contact proposal title
    def contact_repl(m: re.Match) -> str:
        nonlocal changes
        changes += 1
        return m.group(1).replace("<div", "<h2", 1) + m.group(2) + "</h2>"

    html, _ = re.subn(
        r'(<div class="w-text us_custom_c9c6838e has_text_color">)(<span class="w-text-h">.*?</span>)</div>',
        contact_repl,
        html,
        count=1,
        flags=re.S,
    )

    return html, changes


def promote_missing_h1(html: str) -> str:
    """If page has no H1, promote the first H2 that carries a us_custom_* class."""
    if re.search(r"<h1\b", html, flags=re.I):
        return html
    m = re.search(r"<h2(\s[^>]*us_custom_[a-f0-9]+[^>]*)>(.*?)</h2>", html, flags=re.S | re.I)
    if not m:
        m = re.search(r"<h2(\s[^>]*)>(.*?)</h2>", html, flags=re.S | re.I)
    if not m:
        return html
    return html[: m.start()] + f"<h1{m.group(1)}>{m.group(2)}</h1>" + html[m.end() :]


def should_process(path: str, heading_count: int) -> bool:
    if path in SKIP_PATHS or any(path.startswith(p) for p in SKIP_PREFIXES):
        return False
    if path.startswith("/authors/") and path != "/authors/":
        return True
    if path in TARGET_PATHS:
        return True
    return heading_count <= 3 and not path.startswith("/authors/")


def main() -> None:
    pages = json.loads(PAGES_PATH.read_text(encoding="utf-8"))
    report: list[tuple[str, int, dict]] = []

    for page in pages:
        path = page.get("path") or ""
        html = page.get("bodyHtml") or ""
        if not path or not html:
            continue
        existing = len(re.findall(r"<h[1-6]\b", html, flags=re.I))
        if not should_process(path, existing):
            continue

        css_meta = load_css_meta(page)
        total = 0
        new_html, n = upgrade_columns(html, css_meta)
        total += n
        new_html, n2 = upgrade_w_text(new_html)
        total += n2
        new_html = promote_missing_h1(new_html)

        # freelance-journey special: hero p with gradient Today! → h1, keep parent us_custom on column OR move
        if path == "/freelance-journey/":
            m = re.search(
                r'(<div class=")(wpb_text_column[^"]*us_custom_([a-f0-9]+)[^"]*)("[^>]*>\s*<div class="wpb_wrapper">)'
                r'(<p([^>]*)>)((?:[^<]|<(?!/p>))*?Freelance Residency(?:[^<]|<(?!/p>))*?Today!.*?)(</p>)',
                new_html,
                flags=re.S | re.I,
            )
            if m:
                cls_id = m.group(3)
                new_classes = re.sub(r"\s*us_custom_[a-f0-9]+", "", m.group(2)).strip()
                p_attrs = m.group(6) or ""
                if re.search(r"\bclass=", p_attrs, flags=re.I):
                    p_attrs = re.sub(
                        r'class="([^"]*)"',
                        lambda cm: f'class="us_custom_{cls_id} {cm.group(1)}"',
                        p_attrs,
                        count=1,
                    )
                else:
                    p_attrs = f' class="us_custom_{cls_id}"' + p_attrs
                replacement = (
                    f"{m.group(1)}{new_classes}{m.group(4)}"
                    f"<h1{p_attrs}>{m.group(7)}</h1>"
                )
                new_html = new_html[: m.start()] + replacement + new_html[m.end() :]
                # feature h4 → h3 (tag only); move not needed — h4 already has styles via parent or is fine
                # Keep feature cards as h4 if that was original — only ensure page has h1
                total += 1
            # Empower Your Freelance Journey
            new_html2, n = upgrade_columns(new_html, css_meta)
            if n:
                new_html = new_html2
                total += n

        if total == 0 and new_html == html:
            continue

        page["bodyHtml"] = new_html
        content = page.get("content")
        if isinstance(content, str) and "wpb_text_column" in content:
            c_html, cn = upgrade_columns(content, css_meta)
            c_html, cn2 = upgrade_w_text(c_html)
            c_html = promote_missing_h1(c_html)
            if cn or cn2 or c_html != content:
                page["content"] = c_html

        after = dict(Counter(t.lower() for t in re.findall(r"<(h[1-6])\b", new_html, flags=re.I)))
        report.append((path, total, after))

    PAGES_PATH.write_text(json.dumps(pages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {len(report)} pages (tag-only; design tokens moved onto headings)")
    for path, n, after in sorted(report, key=lambda x: -x[1]):
        print(f"  {path}: ~{n} → {after}")


if __name__ == "__main__":
    main()
