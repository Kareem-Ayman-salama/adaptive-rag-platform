"""Build Arabic PDF guide for DocuMind AI explanation and Q&A."""

from __future__ import annotations

import re
from pathlib import Path

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
)

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "PROJECT_EXPLANATION_AND_QA_AR.md"
OUT = ROOT / "docs" / "DocuMind_AI_Arabic_Explanation_QA.pdf"

FONT_REGULAR = "ArabicRegular"
FONT_BOLD = "ArabicBold"
TEXT = colors.HexColor("#20242C")
BLUE = colors.HexColor("#1F4D78")
MUTED = colors.HexColor("#586070")
LIGHT = colors.HexColor("#F2F5F9")


def register_fonts() -> None:
    """Register Arabic-capable Windows fonts."""

    pdfmetrics.registerFont(TTFont(FONT_REGULAR, "C:/Windows/Fonts/tahoma.ttf"))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, "C:/Windows/Fonts/tahomabd.ttf"))


def contains_arabic(text: str) -> bool:
    """Return whether text contains Arabic characters."""

    return any("\u0600" <= char <= "\u06ff" for char in text)


def rtl(text: str) -> str:
    """Shape Arabic text for ReportLab display."""

    if not contains_arabic(text):
        return text
    return get_display(arabic_reshaper.reshape(text))


def esc(text: str) -> str:
    """Escape minimal XML entities for ReportLab paragraphs."""

    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def clean_inline(text: str) -> str:
    """Remove simple Markdown inline markers before PDF rendering."""

    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    return text.strip()


def styles() -> dict[str, ParagraphStyle]:
    """Return paragraph styles for the Arabic guide."""

    return {
        "title": ParagraphStyle(
            "Title",
            fontName=FONT_BOLD,
            fontSize=22,
            leading=30,
            textColor=BLUE,
            alignment=TA_CENTER,
            spaceAfter=14,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            fontName=FONT_REGULAR,
            fontSize=11,
            leading=18,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "Heading1",
            fontName=FONT_BOLD,
            fontSize=15,
            leading=23,
            textColor=BLUE,
            alignment=TA_RIGHT,
            spaceBefore=12,
            spaceAfter=7,
        ),
        "h2": ParagraphStyle(
            "Heading2",
            fontName=FONT_BOLD,
            fontSize=12,
            leading=19,
            textColor=BLUE,
            alignment=TA_RIGHT,
            spaceBefore=8,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            fontName=FONT_REGULAR,
            fontSize=10,
            leading=17,
            textColor=TEXT,
            alignment=TA_RIGHT,
            spaceAfter=5,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            fontName=FONT_REGULAR,
            fontSize=9.5,
            leading=16,
            textColor=TEXT,
            alignment=TA_RIGHT,
            leftIndent=0,
            rightIndent=14,
            spaceAfter=3,
        ),
        "code": ParagraphStyle(
            "Code",
            fontName="Courier",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#1F2937"),
            backColor=LIGHT,
            alignment=TA_LEFT,
            borderPadding=6,
            spaceBefore=4,
            spaceAfter=8,
        ),
    }


def add_paragraph(
    story: list[object],
    text: str,
    style: ParagraphStyle,
    *,
    force_ltr: bool = False,
) -> None:
    """Append a shaped paragraph to the PDF story."""

    rendered = esc(text if force_ltr else rtl(text))
    story.append(Paragraph(rendered, style))


def build_story(markdown: str) -> list[object]:
    """Convert a small Markdown subset into ReportLab flowables."""

    st = styles()
    story: list[object] = []
    in_code = False
    code_lines: list[str] = []
    paragraph_lines: list[str] = []
    first_heading = True

    def flush_paragraph() -> None:
        nonlocal paragraph_lines
        if not paragraph_lines:
            return
        add_paragraph(story, " ".join(paragraph_lines), st["body"])
        paragraph_lines = []

    def flush_code() -> None:
        nonlocal code_lines
        if not code_lines:
            return
        story.append(Preformatted("\n".join(code_lines), st["code"]))
        code_lines = []

    for raw_line in markdown.splitlines():
        line = raw_line.rstrip()
        if line.strip().startswith("```"):
            if in_code:
                flush_code()
                in_code = False
            else:
                flush_paragraph()
                in_code = True
            continue
        if in_code:
            code_lines.append(line)
            continue
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            story.append(Spacer(1, 3))
            continue
        if stripped == "---":
            flush_paragraph()
            story.append(Spacer(1, 6))
            continue
        if stripped.startswith("# "):
            flush_paragraph()
            if not first_heading:
                story.append(PageBreak())
            first_heading = False
            add_paragraph(story, clean_inline(stripped[2:]), st["title"])
            add_paragraph(
                story,
                "دليل عربي للتحضير للعرض والمناقشة - معمارية، Agent، APIs، وأسئلة متوقعة",
                st["subtitle"],
            )
            continue
        if stripped.startswith("## "):
            flush_paragraph()
            add_paragraph(story, clean_inline(stripped[3:]), st["h1"])
            continue
        if stripped.startswith("### "):
            flush_paragraph()
            add_paragraph(story, clean_inline(stripped[4:]), st["h2"])
            continue
        if stripped.startswith("- "):
            flush_paragraph()
            add_paragraph(story, f"• {clean_inline(stripped[2:])}", st["bullet"])
            continue
        paragraph_lines.append(clean_inline(stripped))

    flush_paragraph()
    flush_code()
    return story


def add_page_number(canvas, doc) -> None:
    """Draw footer with page number."""

    canvas.saveState()
    canvas.setFont(FONT_REGULAR, 8)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(A4[0] / 2, 0.8 * cm, f"Page {doc.page}")
    canvas.restoreState()


def main() -> None:
    """Build the Arabic explanation and Q&A PDF."""

    register_fonts()
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.4 * cm,
        bottomMargin=1.4 * cm,
        title="DocuMind AI Arabic Explanation and Q&A",
        author="Kemet AI",
    )
    story = build_story(SOURCE.read_text(encoding="utf-8"))
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(OUT)


if __name__ == "__main__":
    main()
