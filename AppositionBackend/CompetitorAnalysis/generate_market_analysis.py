import argparse
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

from market_data import load_market_data


def _soft_borders(table):
    """Apply subtle gray borders to every cell in a table."""
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.find(qn("w:tblBorders"))
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)

    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = qn(f"w:{edge}")
        border = borders.find(tag)
        if border is None:
            border = OxmlElement(f"w:{edge}")
            borders.append(border)
        border.set(qn("w:val"), "single")
        border.set(qn("w:sz"), "4")
        border.set(qn("w:space"), "0")
        border.set(qn("w:color"), "D9E2F3")


def make_report(data, output_path):
    if not data["overall_summary"]:
        raise ValueError("Supply Gemini analysis JSON before generating a market report")

    doc = Document()
    section = doc.sections[0]
    section.top_margin = section.bottom_margin = Inches(0.62)
    section.left_margin = section.right_margin = Inches(0.72)

    normal = doc.styles["Normal"]
    normal.font.name, normal.font.size = "DejaVu Sans", Pt(8.7)
    normal.paragraph_format.space_after = Pt(3)
    normal.paragraph_format.line_spacing = 1.04
    for style_name, size in (("Title", 17), ("Heading 1", 10.5), ("Heading 2", 9.2)):
        style = doc.styles[style_name]
        style.font.name, style.font.size = "DejaVu Sans", Pt(size)
        style.font.bold, style.font.color.rgb = True, RGBColor(0, 0, 0)
        style.paragraph_format.space_after = Pt(3)
        # Word's stock Title style may carry a blue bottom rule.
        for border in style.element.pPr.findall(qn("w:pBdr")):
            style.element.pPr.remove(border)
    example = data.get("example", False)
    doc.core_properties.title = "Market Analysis Example" if example else "Market Analysis"

    title = doc.add_paragraph(style="Title")
    title.add_run("Market Analysis Example" if example else "Market Analysis")
    idea = data["idea"]
    subtitle = idea.get("AppName") or idea.get("Description") or "App idea"
    doc.add_paragraph(f"App idea  {subtitle[:110]}  |  {len(data['apps'])} ranked competitors")
    if example:
        doc.add_paragraph("Illustrative example. Similarity values and recommendations below are sample data, not results from a live run.")

    doc.add_heading("Overview", level=1)
    doc.add_paragraph(data["overall_summary"])

    doc.add_heading("Closest competitors", level=1)
    table = doc.add_table(rows=1, cols=4)
    table.style = "Table Grid"
    _soft_borders(table)
    for cell, name in zip(table.rows[0].cells, ("No.", "Application", "Similarity index", "Price")):
        cell.text = name
    for index, app in enumerate(data["apps"], 1):
        cells = table.add_row().cells
        for cell, value in zip(cells, (str(index), app["name"],
                                       f"{app['index']:.1f} / 100", app["price"])):
            cell.text = value
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    for cell in table.rows[0].cells:
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                run.bold = True
    for i, app in enumerate(data["apps"][:2]):
        explanation = data["competitor_summaries"].get(i)
        if explanation:
            paragraph = doc.add_paragraph(style="Normal")
            paragraph.add_run(f"{i + 1}. {app['name']}: ").bold = True
            paragraph.add_run(explanation[:130])

    if data["feature_comparison"]:
        doc.add_heading("Feature comparison", level=1)
        doc.add_paragraph("S = described in listing   R = related capability   ? = not established by listing")
        grid = doc.add_table(rows=1, cols=1 + len(data["apps"]))
        grid.style = "Table Grid"
        _soft_borders(grid)
        for cell, value in zip(grid.rows[0].cells,
                               ["Your feature"] + [str(i) for i in range(1, len(data["apps"]) + 1)]):
            cell.text = value
        symbols = {"supported": "S", "related": "R", "not_established": "?"}
        for row in data["feature_comparison"][:8]:
            cells = grid.add_row().cells
            cells[0].text = row["feature"][:72]
            for index in range(len(data["apps"])):
                cells[index + 1].text = symbols[row["cells"][index]["verdict"]]
                for paragraph in cells[index + 1].paragraphs:
                    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        doc.add_paragraph("The numbers correspond to the competitors listed above.")

    doc.add_heading("Ways to differentiate", level=1)
    for item in data["differentiation"][:3]:
        doc.add_heading(item["idea"].strip(), level=2)
        doc.add_paragraph(item["rationale"].strip()[:240])