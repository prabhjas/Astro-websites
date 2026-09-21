#!/usr/bin/env python3
"""Apply CTA/link updates from EOR Main Hub.docx to /eor-main/ in pages.json."""
import json
import re
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]
PAGES_PATH = ROOT / "src/data/pages.json"
PIPEDRIVE = (
    "https://meet.connectgroup.co/meet/lets-start"
)

COUNTRY_LINKS = {
    "UAE.svg": "/employer-of-record/united-arab-emirates/",
    "KSA.svg": "/employer-of-record/saudi-arabia/",
    "Qatar.svg": "/employer-of-record/qatar/",
    "Oman.svg": "/employer-of-record/oman/",
    "Kuwait.svg": "/employer-of-record/kuwait/",
    "Jordan.svg": "/employer-of-record/jordan/",
    "Egypt.svg": "/employer-of-record/egypt/",
    "Lebanon.svg": "/employer-of-record/lebanon/",
}

PRICE_HEADING = (
    "See What's Possible with an EOR<br>"
    "Read real customer stories to see how businesses simplify international hiring with Connect Resources."
)


def update_button(html: str, widget_id: str, *, text: Optional[str] = None, href: Optional[str] = None) -> str:
    pattern = (
        rf'(<div class="elementor-element[^>]*data-id="{re.escape(widget_id)}"[\s\S]*?'
        rf'<a class="elementor-button[^"]*" href=")([^"]*)(">[\s\S]*?'
        rf'<span class="elementor-button-text">)([^<]*)(</span>)'
    )

    def repl(match: re.Match[str]) -> str:
        new_href = href if href is not None else match.group(2)
        new_text = text if text is not None else match.group(4)
        return match.group(1) + new_href + match.group(3) + new_text + match.group(5)

    updated, count = re.subn(pattern, repl, html, count=1)
    if count == 0:
        raise RuntimeError(f"Button widget not found: {widget_id}")
    return updated


def update_price_heading(html: str) -> str:
    pattern = (
        r'(<div class="elementor-element[^>]*data-id="e7a2priceh"[\s\S]*?'
        r'<h2 class="elementor-heading-title elementor-size-default">)([\s\S]*?)(</h2>)'
    )
    updated, count = re.subn(pattern, rf"\1{PRICE_HEADING}\3", html, count=1)
    if count == 0:
        raise RuntimeError("Pricing heading widget e7a2priceh not found")
    return updated


def remove_faq_contact_button(html: str) -> str:
    pattern = (
        r'\s*<div class="elementor-element elementor-element-e7a1faqb[\s\S]*?'
        r'data-widget_type="button\.default">[\s\S]*?</div>\s*</div>\s*</div>'
    )
    updated, count = re.subn(pattern, "", html, count=1)
    if count == 0:
        raise RuntimeError("FAQ Contact Us button e7a1faqb not found")
    return updated


def link_countries(html: str) -> str:
    for svg_file, url in COUNTRY_LINKS.items():
        img_pattern = (
            rf'(<img decoding="async" src="/assets/images/2026/eor-main/{re.escape(svg_file)}"[^>]*/>)'
        )
        if f'href="{url}"' in html and svg_file in html:
            # Already linked in a prior run.
            continue
        html, img_count = re.subn(
            img_pattern,
            rf'<a href="{url}" class="eor-country-link">\1</a>',
            html,
            count=1,
        )
        if img_count == 0:
            raise RuntimeError(f"Country image not found: {svg_file}")

        # Link the country name heading in the same column (first heading after the svg).
        svg_idx = html.find(svg_file)
        heading_pattern = (
            r'(<span class="elementor-heading-title elementor-size-default">)([^<]+)(</span>)'
        )
        heading_match = re.search(heading_pattern, html[svg_idx : svg_idx + 600])
        if not heading_match:
            raise RuntimeError(f"Country heading not found after {svg_file}")
        name = heading_match.group(2).strip()
        old = heading_match.group(0)
        if f'<a href="{url}"' in old:
            continue
        new = (
            f'<span class="elementor-heading-title elementor-size-default">'
            f'<a href="{url}" class="eor-country-link">{name}</a></span>'
        )
        html = html[: svg_idx + heading_match.start()] + new + html[svg_idx + heading_match.end() :]
    return html


def apply_updates(html: str) -> str:
    html = update_button(html, "b5bb18f", text="Get Started", href="/contact/")
    html = update_button(html, "e0309d9", text="Book a Consultation", href=PIPEDRIVE)
    html = update_button(html, "5a57ee7", href="/contact/")
    html = update_button(html, "9caa5c6", href=PIPEDRIVE)
    html = update_button(html, "e7a1featbtn", href=PIPEDRIVE)
    html = update_button(html, "e7a2priceb", text="See Customer Stories", href="/testimonials/")
    html = update_button(html, "e7a1b04", text="Explore Our EOR Services", href="/employer-of-record/")
    html = update_price_heading(html)
    html = remove_faq_contact_button(html)
    html = link_countries(html)
    return html


def main() -> None:
    pages = json.loads(PAGES_PATH.read_text(encoding="utf-8"))
    page = next(p for p in pages if p.get("path") == "/eor-main/")

    for field in ("content", "bodyHtml"):
        if field in page and page[field]:
            page[field] = apply_updates(page[field])

    PAGES_PATH.write_text(json.dumps(pages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {PAGES_PATH}")


if __name__ == "__main__":
    main()
