"""Build PDF documentation for DocuMind AI from the Markdown source."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "PROJECT_DOCUMENTATION.md"
OUT = ROOT / "docs" / "DocuMind_AI_Project_Documentation.pdf"

BLUE = colors.HexColor("#2E74B5")
DARK_BLUE = colors.HexColor("#1F4D78")
MUTED = colors.HexColor("#586070")
LIGHT_FILL = colors.HexColor("#F2F4F7")
GRID = colors.HexColor("#D4DAE3")


def styles() -> dict[str, ParagraphStyle]:
    """Return report styles matching the Word document."""

    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "DocTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=28,
            leading=34,
            textColor=DARK_BLUE,
            alignment=1,
            spaceAfter=10,
        ),
        "subtitle": ParagraphStyle(
            "DocSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=13,
            leading=18,
            textColor=MUTED,
            alignment=1,
            spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "HeadingOne",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=21,
            textColor=BLUE,
            spaceBefore=14,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "HeadingTwo",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=18,
            textColor=BLUE,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=14,
            textColor=colors.black,
            spaceAfter=6,
        ),
        "code": ParagraphStyle(
            "Code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#374151"),
            leftIndent=12,
            spaceAfter=8,
        ),
    }


def clean(text: str) -> str:
    """Clean simple Markdown inline syntax for PDF paragraphs."""

    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("**", "")
        .replace("`", "")
    )


def markdown_table(lines: list[str], st: dict[str, ParagraphStyle]) -> Table | None:
    """Convert a simple Markdown table to a ReportLab table."""

    rows: list[list[str]] = []
    for line in lines:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if all(set(cell) <= {"-", ":", " "} for cell in cells):
            continue
        rows.append(cells)
    if not rows:
        return None
    col_count = len(rows[0])
    data = [[Paragraph(clean(cell), st["body"]) for cell in row] for row in rows]
    table = Table(data, colWidths=[6.5 * inch / col_count] * col_count, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_FILL),
                ("GRID", (0, 0), (-1, -1), 0.5, GRID),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def add_footer(canvas, doc) -> None:
    """Draw a quiet footer on each PDF page."""

    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(inch, 0.55 * inch, "DocuMind AI Project Documentation")
    canvas.drawRightString(7.5 * inch, 0.55 * inch, str(doc.page))
    canvas.restoreState()


def build_story(text: str) -> list:
    """Build ReportLab flowables from Markdown."""

    st = styles()
    story: list = [
        Paragraph("DocuMind AI", st["title"]),
        Paragraph("Adaptive Multimodal RAG for Source-Grounded PDF Intelligence", st["subtitle"]),
        Spacer(1, 12),
    ]

    meta = Table(
        [
            ["Supervisor", "Eng / Jana Hatem"],
            ["Assistant Engineer", "Gad Amr"],
            ["Team", "Kemet AI"],
            ["Deliverables", "Documentation, Presentation, Web Application"],
        ],
        colWidths=[2.0 * inch, 4.5 * inch],
        hAlign="CENTER",
    )
    meta.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, GRID),
                ("BACKGROUND", (0, 0), (0, -1), LIGHT_FILL),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend([meta, Spacer(1, 18), Paragraph("Built around trust, evidence, hallucination control, and education.", st["subtitle"]), PageBreak()])

    lines = text.splitlines()
    i = 0
    in_code = False
    code_lines: list[str] = []
    while i < len(lines):
        stripped = lines[i].strip()
        if stripped.startswith("```"):
            if in_code:
                story.append(Paragraph(clean("\n".join(code_lines)).replace("\n", "<br/>"), st["code"]))
                code_lines = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue
        if in_code:
            code_lines.append(lines[i])
            i += 1
            continue
        if not stripped:
            i += 1
            continue
        if stripped.startswith("|"):
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i])
                i += 1
            table = markdown_table(table_lines, st)
            if table:
                story.extend([table, Spacer(1, 8)])
            continue
        if stripped.startswith("# "):
            heading = stripped.removeprefix("# ").strip()
            if heading != "DocuMind AI - Project Documentation":
                story.append(Paragraph(clean(heading), st["h1"]))
            i += 1
            continue
        if stripped.startswith("## "):
            story.append(Paragraph(clean(stripped.removeprefix("## ").strip()), st["h1"]))
            i += 1
            continue
        if stripped.startswith("### "):
            story.append(Paragraph(clean(stripped.removeprefix("### ").strip()), st["h2"]))
            i += 1
            continue
        if stripped.startswith("- "):
            bullets = []
            while i < len(lines) and lines[i].strip().startswith("- "):
                bullets.append(
                    ListItem(
                        Paragraph(clean(lines[i].strip().removeprefix("- ").strip()), st["body"]),
                        leftIndent=16,
                    )
                )
                i += 1
            story.append(ListFlowable(bullets, bulletType="bullet", leftIndent=18))
            story.append(Spacer(1, 4))
            continue
        if stripped[0].isdigit() and ". " in stripped[:4]:
            items = []
            while i < len(lines):
                current = lines[i].strip()
                if not (current and current[0].isdigit() and ". " in current[:4]):
                    break
                items.append(ListItem(Paragraph(clean(current.split(". ", 1)[1]), st["body"]), leftIndent=16))
                i += 1
            story.append(ListFlowable(items, bulletType="1", leftIndent=18))
            story.append(Spacer(1, 4))
            continue
        story.append(Paragraph(clean(stripped), st["body"]))
        i += 1
    return story


def main() -> None:
    """Build the PDF documentation file."""

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
        title="DocuMind AI Project Documentation",
    )
    doc.build(build_story(SOURCE.read_text(encoding="utf-8")), onFirstPage=add_footer, onLaterPages=add_footer)
    print(OUT)


if __name__ == "__main__":
    main()
