#!/usr/bin/env python3
"""Refresh Snapsale Elementor/theme CSS + google font CSS from live."""
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
UA = {"User-Agent": "Mozilla/5.0"}
paths = [
    "/wp-content/uploads/elementor/css/post-21.css",
    "/wp-content/uploads/elementor/css/post-565.css",
    "/wp-content/uploads/elementor/css/post-586.css",
    "/wp-content/uploads/elementor/css/post-94.css",
    "/wp-content/uploads/elementor/css/post-591.css",
    "/wp-content/cache/fonts/1/google-fonts/css/e/b/c/2d41e24c618bd81952b0ca0d97e1a.css",
    "/wp-content/cache/fonts/1/google-fonts/css/f/8/1/3c94dab8bd387f7f9d6040a055328.css",
    "/wp-content/themes/hello-elementor/style.css",
    "/wp-content/themes/hello-elementor/assets/css/theme.css",
    "/wp-content/themes/hello-elementor/assets/css/header-footer.css",
]

html = ""
for p in list((ROOT / "src/legacy").glob("*.cleaned.html")) + list(
    (ROOT / "src/legacy/insight").glob("*.cleaned.html")
):
    html += p.read_text(errors="ignore") + "\n"
for m in re.findall(r"(?:href|src)=[\"'](/wp-content/[^\"']+\.css)", html, re.I):
    paths.append(m.split("?")[0])

seen = set()
updated = 0
for path in paths:
    if path in seen:
        continue
    seen.add(path)
    local = ROOT / "public" / path.lstrip("/")
    try:
        data = urllib.request.urlopen(
            urllib.request.Request("https://snapsale.ae" + path, headers=UA),
            timeout=30,
        ).read()
    except Exception as exc:
        print("fail", path, exc)
        continue
    head = data[:20].lower()
    if head.startswith(b"<!doctype") or head.startswith(b"<html"):
        print("junk", path)
        continue
    local.parent.mkdir(parents=True, exist_ok=True)
    prev = local.stat().st_size if local.exists() else 0
    local.write_bytes(data)
    if len(data) != prev:
        updated += 1
        print("upd", path, prev, "->", len(data))

kit = ROOT / "public/wp-content/uploads/elementor/css/post-21.css"
print("updated", updated, "kit21", kit.stat().st_size if kit.exists() else 0)
