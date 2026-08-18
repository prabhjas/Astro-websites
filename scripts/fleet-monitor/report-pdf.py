#!/usr/bin/env python3
"""Convert a fleet-monitor markdown report (or the proposal) to a styled PDF.

Usage: python3 scripts/fleet-monitor/report-pdf.py in.md out.pdf   (needs: pip install reportlab)
Supports: #/##/### headings, paragraphs, bullets, numbered lists, pipe tables, fenced code, **bold**, *italic*, `code`.
"""
import os
import re
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (HRFlowable, Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle)

if len(sys.argv) < 3:
    print(__doc__)
    sys.exit(2)
SRC, OUT = sys.argv[1], sys.argv[2]
LANDSCAPE = "--landscape" in sys.argv or "report-" in os.path.basename(SRC) or "weekly-" in os.path.basename(SRC)
PAGE = landscape(letter) if LANDSCAPE else letter
AVAIL = PAGE[0] - 1.5 * inch

ACCENT = colors.HexColor("#1a3a5c")
LIGHT = colors.HexColor("#eef2f7")
GRID = colors.HexColor("#c5cdd8")
CODEBG = colors.HexColor("#f5f6f8")

styles = getSampleStyleSheet()
S = {
    "title": ParagraphStyle("title", parent=styles["Title"], fontSize=18, leading=23, textColor=ACCENT, spaceAfter=6, alignment=TA_LEFT),
    "h2": ParagraphStyle("h2", parent=styles["Heading1"], fontSize=13, leading=17, textColor=ACCENT, spaceBefore=14, spaceAfter=6),
    "h3": ParagraphStyle("h3", parent=styles["Heading2"], fontSize=11, leading=14, textColor=colors.HexColor("#2c5580"), spaceBefore=10, spaceAfter=4),
    "body": ParagraphStyle("body", parent=styles["Normal"], fontSize=9.5, leading=13.5, spaceAfter=5),
    "meta": ParagraphStyle("meta", parent=styles["Normal"], fontSize=9, leading=13, textColor=colors.HexColor("#444444"), spaceAfter=2),
    "bullet": ParagraphStyle("bullet", parent=styles["Normal"], fontSize=9.5, leading=13.5, leftIndent=16, bulletIndent=6, spaceAfter=3),
    "num": ParagraphStyle("num", parent=styles["Normal"], fontSize=9.5, leading=13.5, leftIndent=20, spaceAfter=3),
    "cell": ParagraphStyle("cell", parent=styles["Normal"], fontSize=7.5, leading=10),
    "cellh": ParagraphStyle("cellh", parent=styles["Normal"], fontSize=7.5, leading=10, textColor=colors.white, fontName="Helvetica-Bold"),
}


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def inline(t):
    t = esc(t)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", t)
    codes = []

    def stash(m):
        codes.append(m.group(1))
        return f"\x00{len(codes) - 1}\x00"

    t = re.sub(r"`([^`]+)`", stash, t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<!\w)\*([^*]+)\*(?!\w)", r"<i>\1</i>", t)
    t = re.sub(r"(?<!\w)_([^_]+)_(?!\w)", r"<i>\1</i>", t)
    t = re.sub(r"\x00(\d+)\x00", lambda m: f'<font face="Courier" size="7.5" color="#8a2e2e">{codes[int(m.group(1))]}</font>', t)
    # emoji have no glyphs in base fonts — map to text
    for k, v in {"✅": "OK", "❌": "FAIL", "⚠️": "WARN", "⚠": "WARN", "→": "-&gt;", "Δ": "delta", "·": "&middot;", "—": "&mdash;", "−": "-", "…": "...", "≤": "&lt;=", "×": "x", "☐": "[ ]"}.items():
        t = t.replace(k, v)
    return t


def make_table(rows):
    ncols = max(len(r) for r in rows)
    # weight columns by their longest cell, bounded
    lens = [max(min(len(r[i]) if i < len(r) else 0, 60) for r in rows) + 4 for i in range(ncols)]
    total = float(sum(lens))
    widths = [AVAIL * (l / total) for l in lens]
    data = []
    for i, r in enumerate(rows):
        r = r + [""] * (ncols - len(r))
        st = S["cellh"] if i == 0 else S["cell"]
        data.append([Paragraph(inline(c), st) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT), ("GRID", (0, 0), (-1, -1), 0.4, GRID), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    for i in range(2, len(data), 2):
        style.append(("BACKGROUND", (0, i), (-1, i), LIGHT))
    t.setStyle(TableStyle(style))
    return t


lines = open(SRC, encoding="utf8").read().splitlines()
story, i, meta_block = [], 0, True
while i < len(lines):
    ln = lines[i]
    if ln.startswith("```"):
        block = []
        i += 1
        while i < len(lines) and not lines[i].startswith("```"):
            block.append(lines[i])
            i += 1
        i += 1
        fs = 6.3 if max((len(b) for b in block), default=0) > 80 else 7.5
        story.append(Spacer(1, 4))
        story.append(Preformatted("\n".join(block), ParagraphStyle("code", fontName="Courier", fontSize=fs, leading=fs + 1.6, backColor=CODEBG, borderPadding=6, leftIndent=4)))
        story.append(Spacer(1, 6))
        continue
    if ln.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()):
        rows = [[c.strip() for c in ln.strip().strip("|").split("|")]]
        i += 2
        while i < len(lines) and lines[i].startswith("|"):
            rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
            i += 1
        story.append(Spacer(1, 3))
        story.append(make_table(rows))
        story.append(Spacer(1, 7))
        continue
    if ln.startswith("# "):
        story.append(Paragraph(inline(ln[2:]), S["title"]))
        story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceAfter=8))
    elif ln.startswith("## "):
        story.append(Paragraph(inline(ln[3:]), S["h2"]))
        meta_block = False
    elif ln.startswith("### "):
        story.append(Paragraph(inline(ln[4:]), S["h3"]))
    elif ln.strip() == "---":
        pass
    elif re.match(r"^- \[ \] ", ln):
        story.append(Paragraph("[ ]&nbsp;&nbsp;" + inline(ln[6:]), S["bullet"]))
    elif ln.startswith("- "):
        story.append(Paragraph(inline(ln[2:]), S["bullet"], bulletText="•"))
    elif re.match(r"^\d+\. ", ln):
        n, rest = ln.split(". ", 1)
        story.append(Paragraph(f"<b>{n}.</b> {inline(rest)}", S["num"]))
    elif ln.strip():
        st = S["meta"] if meta_block and ln.startswith("**") else S["body"]
        story.append(Paragraph(inline(ln.rstrip()), st))
    i += 1


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#888888"))
    canvas.drawString(0.75 * inch, 0.5 * inch, "astro-fleet-monitor · Confidential — Connect Group engineering")
    canvas.drawRightString(PAGE[0] - 0.75 * inch, 0.5 * inch, f"Page {doc.page}")
    canvas.restoreState()


doc = SimpleDocTemplate(OUT, pagesize=PAGE, leftMargin=0.75 * inch, rightMargin=0.75 * inch, topMargin=0.7 * inch, bottomMargin=0.8 * inch, title=os.path.basename(SRC), author="Connect Group engineering")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("OK", OUT)
