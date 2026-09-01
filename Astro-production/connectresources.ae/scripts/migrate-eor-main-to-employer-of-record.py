#!/usr/bin/env python3
"""Move /eor-main/ content to /employer-of-record/ and retire /eor-main/."""
import json
import re
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES_PATH = ROOT / "src/data/pages.json"
SITEMAP_PATH = ROOT / "src/data/sitemap-urls.json"
LLMS_PATH = ROOT / "src/data/llms-defaults.json"
TARGET_PATH = "/employer-of-record/"
SOURCE_PATH = "/eor-main/"


def rewrite_paths(text: str) -> str:
    if not text:
        return text
    # Form actions and schema URLs only — not /assets/images/2026/eor-main/
    return re.sub(r'(?<!/assets/images/2026)/eor-main/', '/employer-of-record/', text)


def merge_seo(target_seo: dict, source_seo: dict) -> dict:
    merged = deepcopy(source_seo)
    merged["canonical"] = TARGET_PATH
    merged["robots"] = {"index": "index", "follow": "follow"}
    if merged.get("schemas"):
        merged["schemas"] = json.loads(
            rewrite_paths(json.dumps(merged["schemas"], ensure_ascii=False))
        )
    return merged


def main() -> None:
    pages = json.loads(PAGES_PATH.read_text(encoding="utf-8"))
    source_idx = next(i for i, p in enumerate(pages) if p.get("path") == SOURCE_PATH)
    target_idx = next(i for i, p in enumerate(pages) if p.get("path") == TARGET_PATH)

    source = pages[source_idx]
    target = pages[target_idx]

    content = rewrite_paths(source.get("content") or "")
    body_html = rewrite_paths(source.get("bodyHtml") or content)

    target["title"] = source.get("title") or target.get("title")
    target["content"] = content
    target["bodyHtml"] = body_html
    target["pageCss"] = source.get("pageCss") or target.get("pageCss")
    target["elementorCss"] = source.get("elementorCss")
    target["modified"] = source.get("modified") or target.get("modified")
    target["seo"] = merge_seo(target.get("seo") or {}, source.get("seo") or {})
    if source.get("featuredImage"):
        target["featuredImage"] = source["featuredImage"]

    pages.pop(source_idx)
    pages[target_idx if source_idx > target_idx else target_idx - 1] = target

    PAGES_PATH.write_text(json.dumps(pages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if SITEMAP_PATH.exists():
        sitemap = json.loads(SITEMAP_PATH.read_text(encoding="utf-8"))
        if isinstance(sitemap.get("pages"), list):
            sitemap["pages"] = [p for p in sitemap["pages"] if p != SOURCE_PATH]
            SITEMAP_PATH.write_text(json.dumps(sitemap, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if LLMS_PATH.exists():
        llms = json.loads(LLMS_PATH.read_text(encoding="utf-8"))
        entry = llms.get("entries", {}).get(TARGET_PATH)
        if entry:
            entry["title"] = "Employer of Record (EOR) Hub"
            entry["description"] = (
                "Learn how Employer of Record services help you hire globally without a local entity."
            )
            LLMS_PATH.write_text(json.dumps(llms, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Migrated {SOURCE_PATH} → {TARGET_PATH}")
    print(f"Removed {SOURCE_PATH} from pages.json")


if __name__ == "__main__":
    main()
