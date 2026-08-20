#!/usr/bin/env python3
"""
Clone English page layout for /ar/ URLs and translate visible text to Arabic.
Run: PYTHONUNBUFFERED=1 python3 scripts/generate-ar-pages-from-en.py
"""
from __future__ import annotations

import json
import re
import sys
import time
from copy import deepcopy
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString
from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
PAGES_JSON = ROOT / "src/data/pages.json"
OUT_JSON = ROOT / "src/data/ar-pages.json"
CACHE_JSON = ROOT / "src/data/ar-translation-cache.json"

SKIP_TAGS = {"script", "style", "noscript", "svg", "path", "iframe"}
TRANSLATABLE_ATTRS = ("alt", "placeholder", "aria-label", "title")
BATCH_SIZE = 50
SLEEP_SEC = 0.15


def log(msg: str) -> None:
    print(msg, flush=True)

MAPPINGS = [
    {
        "path": "/ar/مصر-الرواتب-الاستعانة-بمصادر-خارجية/",
        "slug": "مصر-الرواتب-الاستعانة-بمصادر-خارجية",
        "enPath": "/egypt-payroll-outsourcing/",
        "seoTitle": "الاستعانة بمصادر خارجية للرواتب في مصر | متوافق مع قانون العمل",
        "description": "حلول متكاملة لكشوف الرواتب في مصر مع الامتثال لقانون العمل والتأمينات الاجتماعية.",
    },
    {
        "path": "/ar/السعودية-المملكة-العربية-السعودية-ال/",
        "slug": "السعودية-المملكة-العربية-السعودية-ال",
        "enPath": "/saudi-arabia/",
        "seoTitle": "خدمات الموارد البشرية والتوظيف في المملكة العربية السعودية",
        "description": "خدمات صاحب العمل المسجل والتوظيف والرواتب وتأشيرات العمل في السعودية.",
    },
    {
        "path": "/ar/الكويت-خدمات-التوظيف/",
        "slug": "الكويت-خدمات-التوظيف",
        "enPath": "/kuwait-recruitment-services/",
        "seoTitle": "خدمات التوظيف في الكويت - وكالة توظيف رائدة",
        "description": "وكالة توظيف في الكويت توفر مرشحين مؤهلين للشركات بسرعة وامتثال كامل.",
    },
    {
        "path": "/ar/الأردن-صاحب-العمل-من-السجل/",
        "slug": "الأردن-صاحب-العمل-من-السجل",
        "enPath": "/employer-of-record/jordan/",
        "seoTitle": "صاحب العمل المسجل في الأردن - EOR وPEO وكشوف الرواتب",
        "description": "وظّف في الأردن دون تأسيس كيان محلي عبر خدمة صاحب العمل المسجل.",
    },
    {
        "path": "/ar/البحرين/",
        "slug": "البحرين",
        "enPath": "/bahrain-staff-outsourcing/",
        "seoTitle": "الاستعانة بمصادر خارجية للموظفين والخدمات في البحرين",
        "description": "حلول الموارد البشرية والاستعانة بمصادر خارجية للموظفين في البحرين.",
    },
    {
        "path": "/ar/عمان-صاحب-العمل-السجل/",
        "slug": "عمان-صاحب-العمل-السجل",
        "enPath": "/employer-of-record/oman/",
        "seoTitle": "صاحب العمل المسجل في سلطنة عُمان - EOR وخدمات الموارد البشرية",
        "description": "خدمة صاحب العمل المسجل في عُمان لتوظيف قانوني سريع دون تأسيس كيان محلي.",
    },
    {
        "path": "/ar/عمان-خدمات-التوظيف/",
        "slug": "عمان-خدمات-التوظيف",
        "enPath": "/oman-recruitment-services/",
        "seoTitle": "خدمات التوظيف في سلطنة عُمان - وكالة توظيف محترفة",
        "description": "خدمات توظيف في عُمان لمساعدة الشركات على جذب المواهب المناسبة.",
    },
    {
        "path": "/ar/الاستعانة-بمصادر-خارجية-للموظفين/",
        "slug": "الاستعانة-بمصادر-خارجية-للموظفين",
        "enPath": "/staff-outsourcing/",
        "seoTitle": "الاستعانة بمصادر خارجية للموظفين في الإمارات والشرق الأوسط",
        "description": "حلول مرنة ومتوافقة للاستعانة بمصادر خارجية للموظفين.",
    },
    {
        "path": "/ar/تأشيرة-الإقامة-الإماراتية/",
        "slug": "تأشيرة-الإقامة-الإماراتية",
        "enPath": "/uae-residence-visa/",
        "seoTitle": "خدمات تقديم وتجديد تأشيرة الإقامة في الإمارات",
        "description": "خدمات تقديم وتجديد تأشيرات الإقامة في دولة الإمارات.",
    },
    {
        "path": "/ar/الاستعانة-بمصادر-خارجية-لتأشيرات-الب/",
        "slug": "الاستعانة-بمصادر-خارجية-لتأشيرات-الب",
        "enPath": "/employment-visa-outsourcing/",
        "seoTitle": "خدمات الاستعانة بمصادر خارجية لتأشيرات التوظيف في الشرق الأوسط",
        "description": "إدارة تأشيرات العمل والتوظيف عبر الشرق الأوسط من التقديم حتى التصاريح.",
    },
    {
        "path": "/ar/تأشيرة-الإمارات-للممتلكات/",
        "slug": "تأشيرة-الإمارات-للممتلكات",
        "enPath": "/uae-property-visa/",
        "seoTitle": "تأشيرة العقارات في الإمارات - طريقك إلى الإقامة عبر الملكية",
        "description": "احصل على تأشيرة مرتبطة بملكية عقار في الإمارات بدعم إجرائي متخصص.",
    },
    {
        "path": "/ar/الخدمات-الإلكترونية/",
        "slug": "الخدمات-الإلكترونية",
        "enPath": "/e-services/",
        "seoTitle": "برمجيات الموارد البشرية والرواتب السحابية في الإمارات",
        "description": "حلول سحابية لإدارة الموارد البشرية والرواتب لأتمتة العمليات.",
    },
    {
        "path": "/ar/تأشيرة-التقاعد-الإماراتية/",
        "slug": "تأشيرة-التقاعد-الإماراتية",
        "enPath": "/retirement-visa-uae/",
        "seoTitle": "تأشيرة التقاعد في الإمارات - تقاعد بسهولة في دبي",
        "description": "تعرّف على متطلبات تأشيرة التقاعد في الإمارات واحصل على دعم لإتمام الطلب.",
    },
    {
        "path": "/ar/تأشيرة-دخول-متعددة-لدولة-الإمارات-الع/",
        "slug": "تأشيرة-دخول-متعددة-لدولة-الإمارات-الع",
        "enPath": "/uae-residence-visa/",
        "seoTitle": "تأشيرة الدخول المتعددة إلى الإمارات - إرشاد وخدمات تقديم",
        "description": "إرشاد وخدمات لتأشيرات الدخول المتعددة إلى دولة الإمارات.",
    },
]

GLOBAL_REPLACEMENTS = {
    "Contact US": "اتصل بنا",
    "Contact Us": "اتصل بنا",
    "Request a Proposal": "اطلب عرضاً",
    "Load More": "تحميل المزيد",
    "Submit": "إرسال",
    "Send": "إرسال",
    "Read more": "اقرأ المزيد",
    "Learn more": "اعرف المزيد",
    "Home": "الرئيسية",
}


def load_cache() -> dict[str, str]:
    if CACHE_JSON.exists():
        return json.loads(CACHE_JSON.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict[str, str]) -> None:
    CACHE_JSON.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", unescape(text)).strip()


def should_translate(text: str) -> bool:
    raw = str(text)
    if not raw or not raw.strip():
        return False
    core = normalize_text(raw)
    if not core:
        return False
    if len(core) <= 1 and not core.isalpha():
        return False
    if re.fullmatch(r"[\d\s\W_]+", core):
        return False
    if core.startswith("http://") or core.startswith("https://") or core.startswith("/"):
        return False
    if re.fullmatch(r"[+\d\s().-]{6,}", core):
        return False
    if "@" in core and "." in core:
        return False
    if core in GLOBAL_REPLACEMENTS:
        return True
    if re.search(r"[A-Za-z]", core):
        return True
    return False


def translate_batch(strings: list[str], cache: dict[str, str], translator: GoogleTranslator) -> None:
    pending = [s for s in strings if s not in cache and s not in GLOBAL_REPLACEMENTS]
    if not pending:
        return
    for i in range(0, len(pending), BATCH_SIZE):
        chunk = pending[i : i + BATCH_SIZE]
        try:
            translated = translator.translate_batch(chunk)
            for src, dst in zip(chunk, translated):
                cache[src] = dst or src
        except Exception as exc:  # noqa: BLE001
            log(f"  batch translate failed ({exc}); falling back per string")
            for src in chunk:
                try:
                    cache[src] = translator.translate(src)
                    time.sleep(SLEEP_SEC)
                except Exception as inner:  # noqa: BLE001
                    log(f"    skip: {src[:60]!r} ({inner})")
                    cache[src] = src
        time.sleep(SLEEP_SEC)


def translate_value(text: str, cache: dict[str, str]) -> str:
    core = normalize_text(text)
    if core in GLOBAL_REPLACEMENTS:
        return GLOBAL_REPLACEMENTS[core]
    return cache.get(core, text)


def apply_translation_to_string(raw: str, cache: dict[str, str]) -> str:
    leading = re.match(r"^\s*", raw).group(0)
    trailing = re.search(r"\s*$", raw).group(0)
    core = raw.strip()
    if not should_translate(core):
        return raw
    translated = translate_value(core, cache)
    return f"{leading}{translated}{trailing}"


def translate_html(html: str, cache: dict[str, str], translator: GoogleTranslator) -> str:
    soup = BeautifulSoup(html, "html.parser")
    root = soup.find(id="page-content") or soup.find("main") or soup

    to_collect: list[str] = []

    for node in root.descendants:
        if isinstance(node, Comment):
            continue
        if isinstance(node, NavigableString):
            parent = node.parent
            if not parent or parent.name in SKIP_TAGS:
                continue
            if should_translate(str(node)):
                to_collect.append(normalize_text(str(node)))

    for el in root.find_all(True):
        if el.name in SKIP_TAGS:
            continue
        for attr in TRANSLATABLE_ATTRS:
            val = el.get(attr)
            if val and should_translate(val):
                to_collect.append(normalize_text(val))

    unique = list(dict.fromkeys(to_collect))
    log(f"    translating {len(unique)} unique strings…")
    translate_batch(unique, cache, translator)

    for node in list(root.descendants):
        if isinstance(node, NavigableString):
            parent = node.parent
            if not parent or parent.name in SKIP_TAGS:
                continue
            new_text = apply_translation_to_string(str(node), cache)
            if new_text != str(node):
                node.replace_with(new_text)

    for el in root.find_all(True):
        if el.name in SKIP_TAGS:
            continue
        for attr in TRANSLATABLE_ATTRS:
            val = el.get(attr)
            if val and should_translate(val):
                el[attr] = translate_value(normalize_text(val), cache)

    if root.name:
        root["dir"] = "rtl"
        root["lang"] = "ar"
        classes = root.get("class") or []
        if isinstance(classes, str):
            classes = classes.split()
        if "cr-ar-clone" not in classes:
            classes.append("cr-ar-clone")
        root["class"] = classes
        return str(root)

    return str(soup)


def merge_page_css(en_page_css: list[str] | None) -> list[str]:
    css = list(en_page_css or [])
    if "/css/ar-pages.css" not in css:
        css.append("/css/ar-pages.css")
    return css


def main() -> None:
    pages = json.loads(PAGES_JSON.read_text(encoding="utf-8"))
    by_path = {p["path"]: p for p in pages}
    cache = load_cache()
    translator = GoogleTranslator(source="en", target="ar")
    now = datetime.now(timezone.utc).isoformat()
    max_id = max(int(p.get("id") or 0) for p in pages)
    out: list[dict] = []

    for idx, mapping in enumerate(MAPPINGS, start=1):
        en = by_path.get(mapping["enPath"])
        if not en:
            raise SystemExit(f"Missing EN page: {mapping['enPath']}")

        log(f"[{idx}/{len(MAPPINGS)}] {mapping['path']} ← {mapping['enPath']}")
        ar = deepcopy(en)
        ar["id"] = max_id + idx
        ar["slug"] = mapping["slug"]
        ar["path"] = mapping["path"]
        ar["link"] = f"https://connectresources.ae{mapping['path']}"
        ar["title"] = mapping["seoTitle"]
        ar["modified"] = now
        ar["pageCss"] = merge_page_css(en.get("pageCss"))
        ar["seo"] = {
            **(en.get("seo") or {}),
            "title": mapping["seoTitle"],
            "description": mapping["description"],
            "canonical": mapping["path"],
            "robots": {"index": "index", "follow": "follow"},
        }

        source_html = en.get("bodyHtml") or en.get("content") or ""
        ar["bodyHtml"] = translate_html(source_html, cache, translator)
        ar["content"] = ar["bodyHtml"]
        ar["excerpt"] = mapping["description"]
        out.append(ar)
        save_cache(cache)
        log(f"    done ({len(ar['bodyHtml'])} chars)")

    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log(f"\nWrote {len(out)} Arabic clone pages → {OUT_JSON}")


if __name__ == "__main__":
    main()
