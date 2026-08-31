#!/usr/bin/env python3
"""
Apply Lana CR Issue sheet cleanup for connectresources.ae.

Deleted URLs: remove page records entirely (404). No redirects.
Landing pages: keep live with noindex,nofollow.
Press-release CPT: preserve /press-release/ → /press/ redirects.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "src/data/pages.json"
REDIRECTS_YML = ROOT / "src/data/redirects.yml"
SITEMAP_CONFIG = ROOT / "src/lib/seo/sitemap-config.ts"
SITEMAP_URLS = ROOT / "src/data/sitemap-urls.json"
LLMS_DEFAULTS = ROOT / "src/data/llms-defaults.json"

# Deleted URLs — removed from pages.json; must not redirect anywhere.
REMOVED_URLS = [
    "/employer-of-record-main/",
    "/professional-employer-organization-peo-uae/",
    "/professional-employer-organization-dubai-old/",
    "/staff-outsourcing-main-page-r/",
    "/uae-staff-outsourcing/",
    "/staff-outsourcing-uae/",
    "/hr-consultancy-service-page/",
    "/emiratisation-recruitment/",
    "/emiratisation-in-uae/",
    "/relocation-employee-services-uae/",
    "/relocation-consultant-dubai/",
    "/uae-payroll-outsourcing/",
    "/eor-payroll/",
    "/pro-service-page/",
    "/corporate-social-responsibility-connect-resources/",
    "/get-your-uae-recidency-landing-page/",
    "/questions-for-customer-feedback-and-business-review/",
    "/outsourcing-services-uae/",
    "/partner-program-2/",
    "/contact-us-new/",
    "/employer-of-record-eor-uae/",
    "/leadership/",
    "/manpower-outsourcing-services/",
    "/professional-employer-organization/",
    "/golden-visa-uae1212/",
    "/golden-visa-uae222/",
    "/golden-visa-uae/",
    "/eor-main/",
    "/eor-middle-east/",
    "/employer-of-record-middle-east/",
    "/employer-of-record-uae/",
    "/employer-of-record-saudi-arabia/",
    "/employer-of-record-ksa/",
    "/employer-of-record-qatar/",
    "/employer-of-record-egypt/",
    "/international-relocation-service-page/",
    "/it-service-providers-in-dubai/",
    "/employee-feedback-and-business-review/",
    "/bahrain-visa-outsourcing-2/",
    "/property-visa-new/",
    "/uae-residency-visa-new/",
]

REMOVED_PATHS = set(REMOVED_URLS)

LANDING_SLUGS = [
    "employer-of-record-lp",
    "employer-of-record-lp2",
    "landing-page-international-relocation",
    "landing-page-employee-mobility",
    "family-residency",
    "residency-uae",
]

LANDING_PATHS = [f"/{s}/" for s in LANDING_SLUGS]

# Press-release CPT → /press/ (must survive regenerate).
PRESERVED_REDIRECTS = [
    ("/press-release/", "/press/"),
    (
        "/press-release/aaron-portero-managing-director-of-connect-group-appears-in-an-article-by-khaleej-times/",
        "/press/aaron-portero-managing-director-of-connect-group-appears-in-an-article-by-khaleej-times/",
    ),
    (
        "/press-release/aaron-portero-managing-director-of-connect-group-gives-insight-for-agbi-article/",
        "/press/aaron-portero-managing-director-of-connect-group-gives-insight-for-agbi-article/",
    ),
    (
        "/press-release/aaron-portero-talk-about-europeans-are-flocking-to-uae-in-khaleej-times/",
        "/press/aaron-portero-talk-about-europeans-are-flocking-to-uae-in-khaleej-times/",
    ),
    (
        "/press-release/connect-hr-has-been-appraised-by-one-of-the-worlds-biggest-reviewers/",
        "/press/connect-hr-has-been-appraised-by-one-of-the-worlds-biggest-reviewers/",
    ),
    (
        "/press-release/connect-resources-has-appeared-on-one-of-the-top-news-portals-of-the-region/",
        "/press/connect-resources-has-appeared-on-one-of-the-top-news-portals-of-the-region/",
    ),
    (
        "/press-release/connect-resources-has-been-awarded-at-the-mea-business-awards/",
        "/press/connect-resources-has-been-awarded-at-the-mea-business-awards/",
    ),
    (
        "/press-release/connect-resources-has-been-featured-in-bloomberg/",
        "/press/connect-resources-has-been-featured-in-bloomberg/",
    ),
    (
        "/press-release/connect-resources-has-recently-appeared-in-one-of-the-biggest-news-websites-of-the-region/",
        "/press/connect-resources-has-recently-appeared-in-one-of-the-biggest-news-websites-of-the-region/",
    ),
    (
        "/press-release/connect-resources-is-joining-forces-with-the-manzil-center-to-give-back-to-the-community/",
        "/press/connect-resources-is-joining-forces-with-the-manzil-center-to-give-back-to-the-community/",
    ),
    (
        "/press-release/connect-resources-success-story-is-featured-on-mea-markets-magazine/",
        "/press/connect-resources-success-story-is-featured-on-mea-markets-magazine/",
    ),
    (
        "/press-release/connect-resources-team-visit-manzil-center/",
        "/press/connect-resources-team-visit-manzil-center/",
    ),
    (
        "/press-release/euronews-appreciated-employment-services-of-connect-resources/",
        "/press/euronews-appreciated-employment-services-of-connect-resources/",
    ),
    (
        "/press-release/introducing-connect-resources-hiring-partner-and-talent-marketplace-thetalentpoint/",
        "/press/introducing-connect-resources-hiring-partner-and-talent-marketplace-thetalentpoint/",
    ),
    (
        "/press-release/managing-director-of-connect-group-aaron-portero-joins-the-israel-emirates-business-summit-2022-event/",
        "/press/managing-director-of-connect-group-aaron-portero-joins-the-israel-emirates-business-summit-2022-event/",
    ),
    (
        "/press-release/signing-of-memorandum-of-understanding-between-connect-resources-and-city-university-college-of-ajman/",
        "/press/signing-of-memorandum-of-understanding-between-connect-resources-and-city-university-college-of-ajman/",
    ),
]


def write_redirects_yml() -> list[tuple[str, str]]:
    seen: set[str] = set()
    rows: list[tuple[str, str]] = []
    for src, dst in PRESERVED_REDIRECTS:
        if src in seen:
            continue
        seen.add(src)
        rows.append((src, dst))

    lines = [
        "# Connect Resources redirects — press-release CPT → /press/ only.",
        "# Deleted Lana URLs are removed (404); do not add home redirects here.",
        "# Generated/maintained by scripts/apply-lana-url-cleanup.py",
        "redirects:",
    ]
    for src, dst in rows:
        if src == "/press-release/":
            lines.append("  # Press-release CPT → /press/ (archive + singles)")
        lines.append(f"  - from: {src}")
        lines.append(f"    to: {dst}")
        lines.append("    status: 301")

    REDIRECTS_YML.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return rows


def update_sitemap_config() -> None:
    text = SITEMAP_CONFIG.read_text(encoding="utf-8")
    start = text.index("export const NOINDEX_NOFOLLOW_PAGE_SLUGS")
    end = text.index(");", start) + 2
    new_block = """export const NOINDEX_NOFOLLOW_PAGE_SLUGS = new Set([
  // Existing paid / campaign LPs
  'corporate-pro-services',
  'outsourcing',
  'recruitment',
  'payroll-outsourcing-uae',
  'freelance-journey',
  'lp-page-cr',
  // Lana sheet — Landing Page column (keep live, noindex)
  'employer-of-record-lp',
  'employer-of-record-lp2',
  'landing-page-international-relocation',
  'landing-page-employee-mobility',
  'family-residency',
  'residency-uae',
]);"""
    SITEMAP_CONFIG.write_text(text[:start] + new_block + text[end:], encoding="utf-8")


def update_pages_json() -> dict:
    pages = json.loads(PAGES.read_text(encoding="utf-8"))
    by_path = {p["path"]: p for p in pages}
    stats = {"landing_noindex": 0, "deleted_removed": 0}

    for path in LANDING_PATHS:
        p = by_path.get(path)
        if not p:
            continue
        seo = p.get("seo") or {}
        seo["robots"] = {"index": "noindex", "follow": "nofollow"}
        p["seo"] = seo
        stats["landing_noindex"] += 1

    remaining = []
    for p in pages:
        if p.get("path") in REMOVED_PATHS:
            stats["deleted_removed"] += 1
            continue
        remaining.append(p)

    PAGES.write_text(json.dumps(remaining, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return stats


def update_sitemap_urls() -> int:
    if not SITEMAP_URLS.exists():
        return 0
    data = json.loads(SITEMAP_URLS.read_text(encoding="utf-8"))
    removed = 0
    if isinstance(data, dict):
        for key in ("pages", "posts"):
            if key not in data or not isinstance(data[key], list):
                continue
            before = len(data[key])
            data[key] = [u for u in data[key] if u not in REMOVED_PATHS]
            removed += before - len(data[key])
    elif isinstance(data, list):
        before = len(data)
        data = [u for u in data if u not in REMOVED_PATHS]
        removed = before - len(data)
    SITEMAP_URLS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return removed


def update_llms_defaults() -> bool:
    if not LLMS_DEFAULTS.exists():
        return False
    data = json.loads(LLMS_DEFAULTS.read_text(encoding="utf-8"))
    entries = data.get("entries") or {}
    changed = False
    if "/golden-visa-uae/" in entries and "/uae-golden-visa/" not in entries:
        entries["/uae-golden-visa/"] = entries.pop("/golden-visa-uae/")
        changed = True
    for path in list(entries.keys()):
        if path in REMOVED_PATHS:
            entries.pop(path, None)
            changed = True
    if changed:
        data["entries"] = entries
        LLMS_DEFAULTS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed


def main() -> None:
    rows = write_redirects_yml()
    update_sitemap_config()
    stats = update_pages_json()
    sitemap_removed = update_sitemap_urls()
    llms_changed = update_llms_defaults()
    print(f"redirects.yml rules: {len(rows)} (press-release only)")
    for src, dst in rows:
        print(f"  {src} → {dst}")
    print(f"landing noindex: {stats['landing_noindex']}")
    print(f"deleted pages removed: {stats['deleted_removed']}")
    print(f"sitemap-urls entries removed: {sitemap_removed}")
    print(f"llms-defaults updated: {llms_changed}")


if __name__ == "__main__":
    main()
