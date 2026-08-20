#!/usr/bin/env python3
"""
Apply Lana CR Issue sheet: redirects for Deleted URLs, noindex Landing Pages,
preserve Keep pages, rename bahrain-visa-outsourcing-2 → bahrain-visa-outsourcing.
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
    ("/employer-of-record-main/", "/employer-of-record/"),
]

# Deleted → best Keep (or Landing) target. Do NOT include Keep-conflict pages.
DELETED_REDIRECTS = [
    ("/professional-employer-organization-peo-uae/", "/professional-employer-organization-uae/"),
    ("/professional-employer-organization-dubai-old/", "/professional-employer-organization-dubai/"),
    ("/staff-outsourcing-main-page-r/", "/staff-outsourcing/"),
    ("/uae-staff-outsourcing/", "/staff-outsourcing/"),
    ("/staff-outsourcing-uae/", "/staff-outsourcing/"),
    ("/hr-consultancy-service-page/", "/hr-consultancy/"),
    ("/emiratisation-recruitment/", "/emiratisation/"),
    ("/emiratisation-in-uae/", "/emiratisation/"),
    ("/relocation-employee-services-uae/", "/relocation-employee-dubai/"),
    # /relocation-consultant-dubai/ is KEEP — skip
    ("/uae-payroll-outsourcing/", "/payroll/"),
    ("/eor-payroll/", "/payroll/"),
    ("/pro-service-page/", "/pro-services/"),
    ("/corporate-social-responsibility-connect-resources/", "/csr-activity/"),
    ("/get-your-uae-recidency-landing-page/", "/uae-residence-visa/"),
    ("/questions-for-customer-feedback-and-business-review/", "/contact/"),
    ("/outsourcing-services-uae/", "/staff-outsourcing/"),
    ("/partner-program-2/", "/partner-program/"),
    ("/contact-us-new/", "/contact/"),
    ("/employer-of-record-eor-uae/", "/employer-of-record/united-arab-emirates/"),
    ("/leadership/", "/meet-our-team/"),
    ("/manpower-outsourcing-services/", "/staff-outsourcing/"),
    ("/professional-employer-organization/", "/professional-employer-organization-uae/"),
    ("/golden-visa-uae1212/", "/uae-golden-visa/"),
    ("/golden-visa-uae222/", "/uae-golden-visa/"),
    ("/golden-visa-uae/", "/uae-golden-visa/"),
    ("/eor-main/", "/employer-of-record/"),
    ("/eor-middle-east/", "/employer-of-record/"),
    ("/employer-of-record-middle-east/", "/employer-of-record/"),
    ("/employer-of-record-uae/", "/employer-of-record/united-arab-emirates/"),
    ("/employer-of-record-saudi-arabia/", "/employer-of-record/saudi-arabia/"),
    ("/employer-of-record-ksa/", "/employer-of-record/saudi-arabia/"),
    ("/employer-of-record-qatar/", "/employer-of-record/qatar/"),
    ("/employer-of-record-egypt/", "/employer-of-record/egypt/"),
    ("/international-relocation-service-page/", "/global-mobility-dubai/"),
    ("/it-service-providers-in-dubai/", "/it-outsourcing/"),
    ("/employee-feedback-and-business-review/", "/contact/"),
    ("/bahrain-visa-outsourcing-2/", "/bahrain-visa-outsourcing/"),
    ("/property-visa-new/", "/uae-property-visa/"),
    ("/uae-residency-visa-new/", "/uae-residence-visa/"),
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


def write_redirects_yml() -> list[tuple[str, str]]:
    seen: set[str] = set()
    rows: list[tuple[str, str]] = []
    for src, dst in EXPLICIT_REDIRECTS + DELETED_REDIRECTS:
        if src in seen:
            continue
        seen.add(src)
        rows.append((src, dst))

    lines = [
        "# Lana CR Issue sheet — Deleted → Keep / Landing + explicit Redirect",
        "# Generated/maintained for connectresources.ae URL cleanup",
        "redirects:",
    ]
    for src, dst in rows:
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
        "deleted_noindex_backup": 0,
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

    # Deleted sources: backup noindex if somehow served (redirects should win)
    deleted_srcs = {src for src, _ in DELETED_REDIRECTS + EXPLICIT_REDIRECTS}
    for path in deleted_srcs:
        p = by_path.get(path)
        if not p:
            continue
        # skip if this page was renamed away
        if p.get("path") != path:
            continue
        seo = p.get("seo") or {}
        seo["robots"] = {"index": "noindex", "follow": "nofollow"}
        p["seo"] = seo
        stats["deleted_noindex_backup"] += 1

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
    print(f"deleted noindex backup: {stats['deleted_noindex_backup']}")


if __name__ == "__main__":
    main()
