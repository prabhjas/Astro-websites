#!/usr/bin/env python3
"""
Apply Lana CR Issue sheet: redirects for Deleted URLs, noindex Landing Pages,
Deleted URLs 301 to homepage; Landing stay noindex; Keep pages preserved.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "src/data/pages.json"
REDIRECTS_YML = ROOT / "src/data/redirects.yml"
SITEMAP_CONFIG = ROOT / "src/lib/seo/sitemap-config.ts"

# Explicit sheet redirect
EXPLICIT_REDIRECTS = [
    ("/employer-of-record-main/", "/"),
]

# Deleted → best Keep (or Landing) target. Do NOT include Keep-conflict pages.
DELETED_REDIRECTS = [
    ("/professional-employer-organization-peo-uae/", "/"),
    ("/professional-employer-organization-dubai-old/", "/"),
    ("/staff-outsourcing-main-page-r/", "/"),
    ("/uae-staff-outsourcing/", "/"),
    ("/staff-outsourcing-uae/", "/"),
    ("/hr-consultancy-service-page/", "/"),
    ("/emiratisation-recruitment/", "/"),
    ("/emiratisation-in-uae/", "/"),
    ("/relocation-employee-services-uae/", "/"),
    ("/relocation-consultant-dubai/", "/"),
    ("/uae-payroll-outsourcing/", "/"),
    ("/eor-payroll/", "/"),
    ("/pro-service-page/", "/"),
    ("/corporate-social-responsibility-connect-resources/", "/"),
    ("/get-your-uae-recidency-landing-page/", "/"),
    ("/questions-for-customer-feedback-and-business-review/", "/"),
    ("/outsourcing-services-uae/", "/"),
    ("/partner-program-2/", "/"),
    ("/contact-us-new/", "/"),
    ("/employer-of-record-eor-uae/", "/"),
    ("/leadership/", "/"),
    ("/manpower-outsourcing-services/", "/"),
    ("/professional-employer-organization/", "/"),
    ("/golden-visa-uae1212/", "/"),
    ("/golden-visa-uae222/", "/"),
    ("/golden-visa-uae/", "/"),
    ("/eor-main/", "/"),
    ("/eor-middle-east/", "/"),
    ("/employer-of-record-middle-east/", "/"),
    ("/employer-of-record-uae/", "/"),
    ("/employer-of-record-saudi-arabia/", "/"),
    ("/employer-of-record-ksa/", "/"),
    ("/employer-of-record-qatar/", "/"),
    ("/employer-of-record-egypt/", "/"),
    ("/international-relocation-service-page/", "/"),
    ("/it-service-providers-in-dubai/", "/"),
    ("/employee-feedback-and-business-review/", "/"),
    ("/bahrain-visa-outsourcing-2/", "/"),
    ("/property-visa-new/", "/"),
    ("/uae-residency-visa-new/", "/"),
]

LANDING_SLUGS = [
    "employer-of-record-lp",
    "employer-of-record-lp2",
    "landing-page-international-relocation",
    "landing-page-employee-mobility",
    "family-residency",
    "residency-uae",
]

LANDING_PATHS = [f"/{s}/" for s in LANDING_SLUGS]

# Non-Lana redirects that must survive regenerate (press-release CPT → /press/).
# write_redirects_yml() previously overwrote the whole file and dropped these.
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
    for src, dst in EXPLICIT_REDIRECTS + DELETED_REDIRECTS + PRESERVED_REDIRECTS:
        if src in seen:
            continue
        seen.add(src)
        rows.append((src, dst))

    lines = [
        "# Lana CR Issue sheet — Deleted → Keep / Landing + explicit Redirect",
        "# Plus preserved press-release CPT → /press/ (do not drop on regenerate)",
        "# Generated/maintained for connectresources.ae URL cleanup",
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
    # Expand NOINDEX_NOFOLLOW_PAGE_SLUGS with landing pages (keep existing campaign LPs)
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
    stats = {
        "landing_noindex": 0,
        "bahrain_renamed": False,
        "deleted_removed": 0,
    }

    # Rename bahrain-visa-outsourcing-2 → bahrain-visa-outsourcing (Keep URL)
    old = by_path.get("/bahrain-visa-outsourcing-2/")
    if old and "/bahrain-visa-outsourcing/" not in by_path:
        old["path"] = "/bahrain-visa-outsourcing/"
        old["slug"] = "bahrain-visa-outsourcing"
        old["link"] = "https://connectresources.ae/bahrain-visa-outsourcing/"
        seo = old.get("seo") or {}
        seo["canonical"] = "/bahrain-visa-outsourcing/"
        old["seo"] = seo
        stats["bahrain_renamed"] = True

    # Landing pages → noindex,nofollow in pages.json
    for path in LANDING_PATHS:
        p = by_path.get(path)
        if not p:
            continue
        seo = p.get("seo") or {}
        seo["robots"] = {"index": "noindex", "follow": "nofollow"}
        p["seo"] = seo
        stats["landing_noindex"] += 1

    # Deleted sources: remove page records (301 redirects remain in redirects.yml)
    deleted_srcs = {src for src, _ in DELETED_REDIRECTS + EXPLICIT_REDIRECTS}
    remaining = []
    for p in pages:
        path = p.get("path")
        if path in deleted_srcs:
            stats["deleted_removed"] += 1
            continue
        remaining.append(p)
    pages = remaining

    PAGES.write_text(json.dumps(pages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return stats


def main() -> None:
    rows = write_redirects_yml()
    update_sitemap_config()
    stats = update_pages_json()
    print(f"redirects.yml rules: {len(rows)}")
    for src, dst in rows:
        print(f"  {src} → {dst}")
    print(f"landing noindex: {stats['landing_noindex']}")
    print(f"bahrain renamed: {stats['bahrain_renamed']}")
    print(f"deleted pages removed: {stats['deleted_removed']}")


if __name__ == "__main__":
    main()
