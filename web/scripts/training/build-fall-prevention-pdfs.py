#!/usr/bin/env python3
"""Build the six canonical fall-prevention PDF downloads.

The training JSON, claim registry, source registry, and quiz JSON are the only
content sources.  Charts are drawn as vector graphics with ReportLab and all
Japanese text uses an embedded project/runtime font.
"""

from __future__ import annotations

import argparse
import html
import json
import math
from pathlib import Path
from typing import Any, Sequence

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfdoc import PDFString
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


WEB_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = WEB_ROOT / "src" / "data" / "safety-seminars"
DEFAULT_OUTPUT_DIR = (
    WEB_ROOT
    / "public"
    / "training"
    / "safety-seminars"
    / "fall-prevention"
    / "downloads"
)

SLIDE_SIZE = (13.333 * 72, 7.5 * 72)
NAVY = colors.HexColor("#142D4C")
INK = colors.HexColor("#132238")
GREEN = colors.HexColor("#0B5D4B")
GREEN_DARK = colors.HexColor("#08483B")
MINT = colors.HexColor("#EDF6F2")
MINT_STRONG = colors.HexColor("#D8EEE7")
AMBER = colors.HexColor("#F59E0B")
AMBER_PALE = colors.HexColor("#FFF6DB")
CYAN = colors.HexColor("#0891B2")
BLUE_PALE = colors.HexColor("#E9F4F7")
RED = colors.HexColor("#B42318")
RED_PALE = colors.HexColor("#FDECEA")
MUTED = colors.HexColor("#526173")
BORDER = colors.HexColor("#D7DFDC")
PAPER = colors.HexColor("#F7F8F6")
WHITE = colors.white

AS_OF_JA = "基準日 2026年8月27日"
VERSION = "v1.0.0"
BOUNDARY = "この教材は社内安全研修用です。法定の特別教育等を代替するものではありません。"


def load_json(name: str) -> Any:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def set_pdf_metadata(c: canvas.Canvas, title: str) -> None:
    """Apply common metadata to every generated PDF."""
    c.setTitle(title)
    c.setAuthor("安全AIポータル")
    c.setCreator("安全AIポータル")
    c.setSubject(BOUNDARY)
    c.setKeywords("安全研修, 墜落・転落防止, フルハーネス, 社内研修")
    c._doc.Catalog.Lang = PDFString("ja-JP")


def register_fonts() -> tuple[str, str]:
    regular_candidates = [
        (Path(r"C:\Windows\Fonts\BIZ-UDGothicR.ttc"), 0),
        (Path(r"C:\Windows\Fonts\NotoSansJP-VF.ttf"), None),
        (Path(r"C:\Windows\Fonts\meiryo.ttc"), 0),
    ]
    bold_candidates = [
        (Path(r"C:\Windows\Fonts\BIZ-UDGothicB.ttc"), 0),
        (Path(r"C:\Windows\Fonts\NotoSansJP-VF.ttf"), None),
        (Path(r"C:\Windows\Fonts\meiryob.ttc"), 0),
    ]

    def register(name: str, candidates: Sequence[tuple[Path, int | None]]) -> str:
        errors: list[str] = []
        for path, index in candidates:
            if not path.exists():
                continue
            try:
                if index is None:
                    pdfmetrics.registerFont(TTFont(name, str(path)))
                else:
                    pdfmetrics.registerFont(TTFont(name, str(path), subfontIndex=index))
                return name
            except Exception as exc:  # pragma: no cover - environment fallback
                errors.append(f"{path.name}: {exc}")
        raise RuntimeError("Japanese font registration failed: " + " | ".join(errors))

    regular = register("TrainingJP", regular_candidates)
    bold = register("TrainingJP-Bold", bold_candidates)
    pdfmetrics.registerFontFamily("TrainingJP", normal=regular, bold=bold)
    return regular, bold


FONT, FONT_BOLD = register_fonts()


def wrap_text(text: str, font: str, size: float, width: float) -> list[str]:
    """Wrap Japanese text without relying on spaces."""
    lines: list[str] = []
    current = ""
    for char in text:
        if char == "\n":
            lines.append(current)
            current = ""
            continue
        candidate = current + char
        if current and pdfmetrics.stringWidth(candidate, font, size) > width:
            lines.append(current)
            current = char
        else:
            current = candidate
    if current or not lines:
        lines.append(current)
    return lines


def draw_text(
    c: canvas.Canvas,
    text: str,
    x: float,
    y_top: float,
    width: float,
    *,
    font: str = FONT,
    size: float = 16,
    color: colors.Color = INK,
    leading: float | None = None,
    max_lines: int | None = None,
    align: str = "left",
) -> float:
    leading = leading or size * 1.35
    lines = wrap_text(text, font, size, width)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while last and pdfmetrics.stringWidth(last + "…", font, size) > width:
            last = last[:-1]
        lines[-1] = last + "…"
    c.setFillColor(color)
    c.setFont(font, size)
    y = y_top
    for line in lines:
        if align == "center":
            c.drawCentredString(x + width / 2, y - size, line)
        elif align == "right":
            c.drawRightString(x + width, y - size, line)
        else:
            c.drawString(x, y - size, line)
        y -= leading
    return y


def rounded_card(
    c: canvas.Canvas,
    x: float,
    y: float,
    w: float,
    h: float,
    *,
    fill: colors.Color = WHITE,
    stroke: colors.Color = BORDER,
    radius: float = 10,
    line_width: float = 1,
) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(line_width)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def draw_slide_footer(
    c: canvas.Canvas,
    slide: dict[str, Any],
    source_numbers: Sequence[int],
    *,
    dark: bool = False,
) -> None:
    w, _ = SLIDE_SIZE
    color = colors.HexColor("#D6E0EB") if dark else MUTED
    c.setStrokeColor(colors.HexColor("#C5D0D8") if not dark else colors.HexColor("#4F6680"))
    c.setLineWidth(0.6)
    c.line(34, 28, w - 34, 28)
    c.setFillColor(color)
    c.setFont(FONT, 7.2)
    refs = " ".join(f"[{number}]" for number in source_numbers) or "共通正本"
    c.drawString(36, 15, f"出典 {refs}｜{AS_OF_JA}｜{VERSION}")
    c.drawRightString(w - 36, 15, f"{slide['number']} / 20")


def draw_image_contain(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float) -> None:
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = min(w / iw, h / ih)
    rw, rh = iw * scale, ih * scale
    c.drawImage(image, x + (w - rw) / 2, y + (h - rh) / 2, rw, rh, mask="auto")


def resolve_image(src: str) -> Path:
    mapping = {
        "/mascot-teacher.webp": "/mascot/mascot-teacher.webp",
        "/mascot-thinking.webp": "/mascot/mascot-thinking.webp",
        "/mascot-salute.webp": "/mascot/mascot-salute.webp",
    }
    normalized = mapping.get(src, src)
    path = WEB_ROOT / "public" / normalized.lstrip("/")
    if not path.exists():
        raise FileNotFoundError(f"Training image not found: {path}")
    return path


def draw_metric_cards(c: canvas.Canvas, metrics: Sequence[dict[str, Any]], x: float, y: float, w: float, h: float) -> None:
    cols = 2
    rows = math.ceil(len(metrics) / cols)
    gap = 12
    cw = (w - gap) / cols
    ch = (h - gap * (rows - 1)) / rows
    for index, metric in enumerate(metrics):
        col = index % cols
        row = index // cols
        cx = x + col * (cw + gap)
        cy = y + h - (row + 1) * ch - row * gap
        rounded_card(c, cx, cy, cw, ch, fill=MINT if index % 2 == 0 else BLUE_PALE, stroke=colors.HexColor("#B9D6CF"))
        draw_text(c, str(metric["label"]), cx + 18, cy + ch - 17, cw - 36, font=FONT_BOLD, size=11.5, color=MUTED, max_lines=2)
        draw_text(c, str(metric["value"]), cx + 18, cy + ch - 51, cw - 36, font=FONT_BOLD, size=29, color=GREEN_DARK, max_lines=1)
        if metric.get("note"):
            draw_text(c, str(metric["note"]), cx + 18, cy + 24, cw - 36, size=9, color=MUTED, max_lines=1)


def draw_steps(c: canvas.Canvas, steps: Sequence[dict[str, str]], x: float, y: float, w: float, h: float) -> None:
    gap = 18
    cw = (w - gap * (len(steps) - 1)) / len(steps)
    for index, step in enumerate(steps):
        cx = x + index * (cw + gap)
        rounded_card(c, cx, y, cw, h, fill=WHITE, stroke=colors.HexColor("#B7D3CC"), radius=14, line_width=1.2)
        c.setFillColor(GREEN)
        c.circle(cx + cw / 2, y + h - 42, 20, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(FONT_BOLD, 16)
        c.drawCentredString(cx + cw / 2, y + h - 48, str(index + 1))
        draw_text(c, step["label"], cx + 14, y + h - 78, cw - 28, font=FONT_BOLD, size=15, color=NAVY, max_lines=2, align="center")
        draw_text(c, step["detail"], cx + 16, y + h - 136, cw - 32, size=11.2, color=MUTED, max_lines=4, align="center")
        if index < len(steps) - 1:
            c.setStrokeColor(AMBER)
            c.setLineWidth(2.5)
            ax = cx + cw + 4
            ay = y + h / 2
            c.line(ax, ay, ax + gap - 8, ay)
            c.line(ax + gap - 13, ay + 4, ax + gap - 8, ay)
            c.line(ax + gap - 13, ay - 4, ax + gap - 8, ay)


def draw_checklist(c: canvas.Canvas, items: Sequence[str], x: float, y: float, w: float, h: float) -> None:
    cols = 2 if len(items) > 4 else 1
    rows = math.ceil(len(items) / cols)
    gap_x, gap_y = 14, 10
    cw = (w - gap_x * (cols - 1)) / cols
    ch = (h - gap_y * (rows - 1)) / rows
    for index, item in enumerate(items):
        col = index // rows if cols == 2 else 0
        row = index % rows if cols == 2 else index
        cx = x + col * (cw + gap_x)
        cy = y + h - (row + 1) * ch - row * gap_y
        rounded_card(c, cx, cy, cw, ch, fill=WHITE, stroke=BORDER, radius=8)
        c.setFillColor(GREEN)
        c.circle(cx + 24, cy + ch / 2, 11, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(FONT_BOLD, 11)
        c.drawCentredString(cx + 24, cy + ch / 2 - 4, "✓")
        draw_text(c, item, cx + 45, cy + ch / 2 + 14, cw - 58, font=FONT_BOLD, size=11.5, max_lines=2)


def draw_trend(c: canvas.Canvas, points: Sequence[dict[str, int]], x: float, y: float, w: float, h: float) -> None:
    gap = 22
    panel_h = (h - gap) / 2

    def panel(py: float, key: str, title: str, color: colors.Color, min_value: int | None = None) -> None:
        rounded_card(c, x, py, w, panel_h, fill=WHITE, stroke=BORDER, radius=8)
        pad_l, pad_r, pad_b, pad_t = 55, 24, 30, 34
        px0, px1 = x + pad_l, x + w - pad_r
        py0, py1 = py + pad_b, py + panel_h - pad_t
        values = [point[key] for point in points]
        v_min = min_value if min_value is not None else 0
        v_max = max(values)
        span = max(1, v_max - v_min)
        c.setFont(FONT_BOLD, 11)
        c.setFillColor(NAVY)
        c.drawString(x + 16, py + panel_h - 22, title)
        for grid_i in range(3):
            value = v_min + span * grid_i / 2
            gy = py0 + (py1 - py0) * grid_i / 2
            c.setStrokeColor(colors.HexColor("#E2E8EA"))
            c.setLineWidth(0.6)
            c.line(px0, gy, px1, gy)
            c.setFillColor(MUTED)
            c.setFont(FONT, 7.5)
            c.drawRightString(px0 - 6, gy - 3, f"{value:,.0f}")
        coords: list[tuple[float, float]] = []
        for idx, point in enumerate(points):
            px = px0 + (px1 - px0) * idx / (len(points) - 1)
            value = point[key]
            pyy = py0 + (py1 - py0) * (value - v_min) / span
            coords.append((px, pyy))
            if idx in {0, len(points) - 1} or point["year"] % 2 == 0:
                c.setFillColor(MUTED)
                c.setFont(FONT, 7)
                c.drawCentredString(px, py + 12, str(point["year"]))
        c.setStrokeColor(color)
        c.setLineWidth(2.2)
        path = c.beginPath()
        path.moveTo(*coords[0])
        for px, pyy in coords[1:]:
            path.lineTo(px, pyy)
        c.drawPath(path, fill=0, stroke=1)
        for idx, (px, pyy) in enumerate(coords):
            c.setFillColor(color)
            c.circle(px, pyy, 2.8, fill=1, stroke=0)
            if idx in {0, len(coords) - 1}:
                c.setFillColor(INK)
                c.setFont(FONT_BOLD, 7.5)
                c.drawCentredString(px, pyy + 8, f"{values[idx]:,}")

    panel(y + panel_h + gap, "injuries", "休業4日以上死傷（人・非ゼロ起点）", GREEN, 4000)
    panel(y, "deaths", "死亡（人・非ゼロ起点）", AMBER, 60)


def draw_bars(c: canvas.Canvas, visual: dict[str, Any], x: float, y: float, w: float, h: float) -> None:
    bars = visual["bars"]
    max_value = visual["max"]
    label_w = 105
    value_w = 42
    row_h = h / len(bars)
    bar_w = w - label_w - value_w - 14
    for index, bar in enumerate(bars):
        cy = y + h - (index + 1) * row_h + row_h * 0.20
        c.setFillColor(INK)
        c.setFont(FONT, 8.8)
        c.drawRightString(x + label_w - 8, cy + row_h * 0.2, bar["label"])
        c.setFillColor(colors.HexColor("#E8EFED"))
        c.roundRect(x + label_w, cy, bar_w, row_h * 0.48, 3, fill=1, stroke=0)
        c.setFillColor(GREEN if index < 4 else CYAN)
        c.roundRect(x + label_w, cy, bar_w * bar["value"] / max_value, row_h * 0.48, 3, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 8.5)
        c.drawRightString(x + w, cy + row_h * 0.18, bar["display"])
    c.setFillColor(MUTED)
    c.setFont(FONT, 7.8)
    c.drawRightString(x + w, y - 11, visual["unit"])


def draw_ky(c: canvas.Canvas, visual: dict[str, Any], x: float, y: float, w: float, h: float) -> None:
    image_w = w * 0.55
    rounded_card(c, x, y, image_w, h, fill=WHITE, stroke=BORDER, radius=10)
    draw_image_contain(c, resolve_image(visual["image"]), x + 8, y + 8, image_w - 16, h - 16)
    prompts_x = x + image_w + 16
    prompt_w = w - image_w - 16
    prompt_h = (h - 24) / 4
    for index, prompt in enumerate(visual["prompts"]):
        py = y + h - (index + 1) * prompt_h - index * 8
        rounded_card(c, prompts_x, py, prompt_w, prompt_h, fill=MINT if index % 2 == 0 else AMBER_PALE, stroke=BORDER, radius=8)
        c.setFillColor(GREEN)
        c.circle(prompts_x + 20, py + prompt_h / 2, 10, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(FONT_BOLD, 9)
        c.drawCentredString(prompts_x + 20, py + prompt_h / 2 - 3, str(index + 1))
        draw_text(c, prompt, prompts_x + 38, py + prompt_h / 2 + 11, prompt_w - 48, font=FONT_BOLD, size=10.5, max_lines=2)


def slide_source_numbers(
    slide: dict[str, Any], claims_by_id: dict[str, dict[str, Any]], source_index: dict[str, int]
) -> list[int]:
    source_ids: list[str] = []
    for claim_id in slide.get("claimIds", []):
        for source_id in claims_by_id[claim_id]["sourceIds"]:
            if source_id not in source_ids:
                source_ids.append(source_id)
    return [source_index[source_id] for source_id in source_ids]


def build_slide_deck(
    output: Path,
    training: dict[str, Any],
    claims_by_id: dict[str, dict[str, Any]],
    source_index: dict[str, int],
) -> None:
    c = canvas.Canvas(str(output), pagesize=SLIDE_SIZE, pageCompression=1)
    set_pdf_metadata(c, training["title"])
    w, h = SLIDE_SIZE
    for slide in training["slides"]:
        is_cover = slide["number"] == 1
        if is_cover:
            c.setFillColor(NAVY)
            c.rect(0, 0, w, h, fill=1, stroke=0)
            c.setFillColor(GREEN)
            c.rect(0, 0, 18, h, fill=1, stroke=0)
            c.setFillColor(AMBER)
            c.rect(18, h - 12, w - 18, 12, fill=1, stroke=0)
            draw_text(c, slide["kicker"], 52, h - 58, 500, font=FONT_BOLD, size=12, color=colors.HexColor("#A7E2D0"), max_lines=1)
            draw_text(c, slide["title"], 52, h - 95, 610, font=FONT_BOLD, size=31, color=WHITE, leading=40, max_lines=3)
            draw_text(c, slide["message"], 54, h - 220, 520, size=15, color=colors.HexColor("#D9E5EE"), leading=22, max_lines=3)
            for index, item in enumerate(slide.get("body", [])):
                rounded_card(c, 54 + index * 194, 108, 180, 50, fill=colors.HexColor("#1E3C61"), stroke=colors.HexColor("#4C6683"), radius=8)
                draw_text(c, item, 66 + index * 194, 143, 156, font=FONT_BOLD, size=11, color=WHITE, max_lines=2, align="center")
            image_path = resolve_image(slide["visual"]["src"])
            draw_image_contain(c, image_path, w - 300, 105, 230, 330)
            c.setFillColor(colors.HexColor("#BFD1DE"))
            c.setFont(FONT, 8.5)
            c.drawString(54, 72, BOUNDARY)
            draw_slide_footer(c, slide, [], dark=True)
            c.showPage()
            continue

        c.setFillColor(PAPER)
        c.rect(0, 0, w, h, fill=1, stroke=0)
        c.setFillColor(GREEN)
        c.rect(0, h - 8, w, 8, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.rect(w - 148, h - 8, 148, 8, fill=1, stroke=0)
        draw_text(c, slide["kicker"], 38, h - 32, 360, font=FONT_BOLD, size=9.5, color=GREEN, max_lines=1)
        draw_text(c, slide["title"], 38, h - 55, w - 76, font=FONT_BOLD, size=24, color=NAVY, leading=30, max_lines=2)
        label = slide.get("label", "")
        label_w = max(72, pdfmetrics.stringWidth(label, FONT_BOLD, 8.5) + 24)
        rounded_card(c, w - label_w - 38, h - 73, label_w, 26, fill=AMBER_PALE, stroke=colors.HexColor("#F2D18A"), radius=13)
        draw_text(c, label, w - label_w - 38, h - 56, label_w, font=FONT_BOLD, size=8.5, color=colors.HexColor("#7A3D00"), max_lines=1, align="center")

        rounded_card(c, 38, h - 148, w - 76, 58, fill=NAVY, stroke=NAVY, radius=10)
        draw_text(c, slide["message"], 58, h - 105, w - 116, font=FONT_BOLD, size=15, color=WHITE, leading=20, max_lines=2, align="center")

        visual = slide["visual"]
        visual_x, visual_y, visual_w, visual_h = 38, 86, w - 76, h - 256
        if slide.get("body"):
            visual_h -= 38
        visual_type = visual["type"]
        if visual_type == "metrics":
            draw_metric_cards(c, visual["metrics"], visual_x, visual_y, visual_w, visual_h)
        elif visual_type == "steps":
            draw_steps(c, visual["steps"], visual_x, visual_y, visual_w, visual_h)
        elif visual_type == "checklist":
            draw_checklist(c, visual["items"], visual_x, visual_y, visual_w, visual_h)
        elif visual_type == "trend":
            draw_trend(c, visual["points"], visual_x, visual_y, visual_w, visual_h)
        elif visual_type == "bars":
            draw_bars(c, visual, visual_x + 25, visual_y + 5, visual_w - 50, visual_h - 10)
        elif visual_type == "ky":
            draw_ky(c, visual, visual_x, visual_y, visual_w, visual_h)
        elif visual_type == "image":
            rounded_card(c, visual_x, visual_y, visual_w * 0.54, visual_h, fill=WHITE, stroke=BORDER, radius=10)
            draw_image_contain(c, resolve_image(visual["src"]), visual_x + 10, visual_y + 10, visual_w * 0.54 - 20, visual_h - 20)
            body = slide.get("body", [])
            if body:
                panel_x = visual_x + visual_w * 0.57
                panel_w = visual_w * 0.43
                item_h = (visual_h - 12 * (len(body) - 1)) / len(body)
                for index, item in enumerate(body):
                    iy = visual_y + visual_h - (index + 1) * item_h - index * 12
                    rounded_card(c, panel_x, iy, panel_w, item_h, fill=MINT if index % 2 == 0 else AMBER_PALE, stroke=BORDER, radius=10)
                    draw_text(c, item, panel_x + 16, iy + item_h / 2 + 18, panel_w - 32, font=FONT_BOLD, size=12.5, max_lines=3, align="center")
        else:
            raise ValueError(f"Unsupported slide visual type: {visual_type}")

        if slide.get("body") and visual_type != "image":
            body_text = "　｜　".join(slide["body"])
            draw_text(c, body_text, 42, 69, w - 84, size=8.8, color=MUTED, max_lines=2, align="center")

        draw_slide_footer(c, slide, slide_source_numbers(slide, claims_by_id, source_index))
        c.showPage()
    c.save()


def styles() -> dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("TitleJP", parent=sample["Title"], fontName=FONT_BOLD, fontSize=23, leading=31, textColor=NAVY, spaceAfter=12, wordWrap="CJK"),
        "h1": ParagraphStyle("H1JP", parent=sample["Heading1"], fontName=FONT_BOLD, fontSize=16, leading=22, textColor=NAVY, spaceBefore=3, spaceAfter=8, wordWrap="CJK"),
        "h2": ParagraphStyle("H2JP", parent=sample["Heading2"], fontName=FONT_BOLD, fontSize=12.2, leading=17, textColor=GREEN_DARK, spaceBefore=5, spaceAfter=4, wordWrap="CJK"),
        "body": ParagraphStyle("BodyJP", parent=sample["BodyText"], fontName=FONT, fontSize=9.2, leading=14, textColor=INK, spaceAfter=6, wordWrap="CJK"),
        "small": ParagraphStyle("SmallJP", parent=sample["BodyText"], fontName=FONT, fontSize=7.2, leading=10.2, textColor=MUTED, spaceAfter=3, wordWrap="CJK"),
        "label": ParagraphStyle("LabelJP", parent=sample["BodyText"], fontName=FONT_BOLD, fontSize=8.4, leading=11, textColor=GREEN_DARK, wordWrap="CJK"),
        "center": ParagraphStyle("CenterJP", parent=sample["BodyText"], fontName=FONT_BOLD, fontSize=10, leading=14, alignment=TA_CENTER, textColor=NAVY, wordWrap="CJK"),
    }


def doc_header_footer(c: canvas.Canvas, doc: BaseDocTemplate, title: str) -> None:
    w, h = A4
    set_pdf_metadata(c, title)
    c.saveState()
    c.setFillColor(GREEN)
    c.rect(0, h - 7 * mm, w, 7 * mm, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont(FONT_BOLD, 7.5)
    c.drawString(16 * mm, h - 12 * mm, title)
    c.setFillColor(MUTED)
    c.setFont(FONT, 7)
    c.drawString(16 * mm, 10 * mm, f"安全AIポータル｜{AS_OF_JA}｜{VERSION}")
    c.drawCentredString(w / 2, 10 * mm, BOUNDARY)
    c.drawRightString(w - 16 * mm, 10 * mm, f"{doc.page}")
    c.restoreState()


def make_doc(path: Path, title: str) -> BaseDocTemplate:
    doc = BaseDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=18 * mm,
        bottomMargin=17 * mm,
        title=title,
        author="安全AIポータル",
        subject=BOUNDARY,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates(PageTemplate(id="standard", frames=[frame], onPage=lambda c, d: doc_header_footer(c, d, title)))
    return doc


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(html.escape(str(text)).replace("\n", "<br/>"), style)


def bullet(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(f"<font color='#0B5D4B'>●</font> {html.escape(text)}", style)


def build_instructor_script(
    output: Path,
    training: dict[str, Any],
    claims_by_id: dict[str, dict[str, Any]],
    source_index: dict[str, int],
) -> None:
    st = styles()
    doc = make_doc(output, "講師用台本")
    story: list[Any] = [
        Spacer(1, 15 * mm),
        p("講師用台本", st["title"]),
        p(training["title"], st["h1"]),
        p(training["subtitle"], st["body"]),
        Spacer(1, 5 * mm),
        Table(
            [
                [p("標準構成", st["label"]), p("音声付き約35〜50分／演習・討議込み約60分", st["body"])],
                [p("対象", st["label"]), p("、".join(training["audience"]), st["body"])],
                [p("使い方", st["label"]), p("スライド本文を短く示し、台本で定義・境界・注意点を補足します。Visual KY演習では音声終了後に9分停止します。", st["body"])],
            ],
            colWidths=[32 * mm, 142 * mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), MINT),
                ("GRID", (0, 0), (-1, -1), 0.6, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]),
        ),
        Spacer(1, 7 * mm),
        p(BOUNDARY, st["h2"]),
        p("法律上の義務、行政上の推奨、科学的知見、教材上の提案を区別して説明してください。具体的な作業への適用は作業条件と現行条文、メーカー資料、自社手順を照合します。", st["body"]),
        PageBreak(),
    ]
    for slide in training["slides"]:
        refs = slide_source_numbers(slide, claims_by_id, source_index)
        story.extend([
            p(f"スライド {slide['number']} / 20", st["label"]),
            p(slide["title"], st["title"]),
            p(slide["message"], st["h2"]),
        ])
        if slide.get("body"):
            story.append(Table([[bullet(item, st["body"])] for item in slide["body"]], colWidths=[doc.width], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), MINT), ("BOX", (0, 0), (-1, -1), 0.5, BORDER), ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)])))
            story.append(Spacer(1, 3 * mm))
        story.extend([
            p("音声原稿", st["h2"]),
            p(slide["narration"], st["body"]),
            p("講師向け補足", st["h2"]),
        ])
        for note in slide.get("instructorNotes", []):
            story.append(bullet(note, st["body"]))
        minutes, seconds = divmod(int(slide.get("estimatedSeconds", 0)), 60)
        source_text = " ".join(f"[{number}]" for number in refs) or "共通正本"
        story.extend([
            Spacer(1, 2 * mm),
            Table(
                [[p("目安", st["label"]), p(f"{minutes}分{seconds:02d}秒", st["small"]), p("Claim ID", st["label"]), p(" / ".join(slide.get("claimIds", [])) or "なし", st["small"])], [p("出典", st["label"]), p(source_text, st["small"]), p("区分", st["label"]), p(slide.get("label", ""), st["small"]) ]],
                colWidths=[18 * mm, 25 * mm, 22 * mm, 109 * mm],
                style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), PAPER), ("GRID", (0, 0), (-1, -1), 0.4, BORDER), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]),
            ),
            PageBreak(),
        ])
    doc.build(story[:-1])


def draw_handout(
    output: Path,
    training: dict[str, Any],
    claims_by_id: dict[str, dict[str, Any]],
    source_index: dict[str, int],
) -> None:
    c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
    w, h = A4
    set_pdf_metadata(c, "参加者配布用1枚資料")
    c.setFillColor(PAPER)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.rect(0, h - 47 * mm, w, 47 * mm, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(0, h - 5 * mm, w, 5 * mm, fill=1, stroke=0)
    draw_text(c, "参加者配布用1枚資料", 14 * mm, h - 14 * mm, 105 * mm, font=FONT_BOLD, size=9, color=colors.HexColor("#A7E2D0"))
    draw_text(c, training["title"], 14 * mm, h - 22 * mm, 145 * mm, font=FONT_BOLD, size=20, color=WHITE, leading=26, max_lines=2)
    draw_text(c, AS_OF_JA, 14 * mm, h - 42 * mm, 100 * mm, size=8, color=colors.HexColor("#D9E5EE"))
    draw_image_contain(c, resolve_image("/mascot/mascot-teacher.webp"), 164 * mm, h - 45 * mm, 30 * mm, 37 * mm)

    margin = 14 * mm
    content_w = w - 2 * margin
    y_top = h - 54 * mm
    draw_text(c, "持ち帰る3点", margin, y_top, content_w, font=FONT_BOLD, size=13, color=NAVY)
    steps = [
        ("1", "設備で防ぐ", "高所回避 → 作業床・手すり・覆い"),
        ("2", "条件を照合", "器具・取付点・下方空間・使用質量"),
        ("3", "救助まで決める", "方法・機材・役割・連絡・訓練"),
    ]
    gap = 4 * mm
    card_w = (content_w - gap * 2) / 3
    card_y = y_top - 36 * mm
    for idx, (number, title, detail) in enumerate(steps):
        x = margin + idx * (card_w + gap)
        rounded_card(c, x, card_y, card_w, 29 * mm, fill=MINT if idx != 1 else BLUE_PALE, stroke=BORDER, radius=7)
        c.setFillColor(GREEN)
        c.circle(x + 8 * mm, card_y + 20 * mm, 4.2 * mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(FONT_BOLD, 10)
        c.drawCentredString(x + 8 * mm, card_y + 18.6 * mm, number)
        draw_text(c, title, x + 15 * mm, card_y + 25 * mm, card_w - 18 * mm, font=FONT_BOLD, size=10, color=NAVY, max_lines=1)
        draw_text(c, detail, x + 5 * mm, card_y + 13 * mm, card_w - 10 * mm, size=7.8, color=MUTED, max_lines=2, align="center")

    stats_y = card_y - 42 * mm
    rounded_card(c, margin, stats_y, 83 * mm, 35 * mm, fill=WHITE, stroke=BORDER, radius=8)
    draw_text(c, "2025年 全国確定値（COVID-19除外）", margin + 5 * mm, stats_y + 31 * mm, 73 * mm, font=FONT_BOLD, size=8.5, color=GREEN_DARK, max_lines=1)
    draw_text(c, "建設業：墜落・転落死亡 91 / 214人", margin + 5 * mm, stats_y + 22 * mm, 73 * mm, font=FONT_BOLD, size=10.5, color=NAVY, max_lines=1)
    draw_text(c, "休業4日以上死傷 4,343 / 13,437人", margin + 5 * mm, stats_y + 13 * mm, 73 * mm, font=FONT_BOLD, size=10.5, color=NAVY, max_lines=1)
    stats_source_numbers = slide_source_numbers(
        {"claimIds": ["CLM-STAT-002", "CLM-STAT-003", "CLM-STAT-009"]},
        claims_by_id,
        source_index,
    )
    stats_refs = "".join(f"[{number}]" for number in stats_source_numbers)
    draw_text(c, f"{stats_refs} 死亡と死傷は加算しない", margin + 5 * mm, stats_y + 5 * mm, 73 * mm, size=7, color=MUTED, max_lines=1)

    rounded_card(c, margin + 88 * mm, stats_y, content_w - 88 * mm, 35 * mm, fill=AMBER_PALE, stroke=colors.HexColor("#F2D18A"), radius=8)
    draw_text(c, "制度の境界", margin + 93 * mm, stats_y + 31 * mm, content_w - 98 * mm, font=FONT_BOLD, size=8.5, color=colors.HexColor("#7A3D00"), max_lines=1)
    draw_text(c, "6.75m超：告示上の法的境界", margin + 93 * mm, stats_y + 22 * mm, content_w - 98 * mm, font=FONT_BOLD, size=10.5, color=NAVY, max_lines=1)
    draw_text(c, "5m超：一般的建設作業の行政目安", margin + 93 * mm, stats_y + 13 * mm, content_w - 98 * mm, font=FONT_BOLD, size=9.2, color=NAVY, max_lines=1)
    draw_text(c, "特別教育は作業条件で対象判定 [3][4][5][6]", margin + 93 * mm, stats_y + 5 * mm, content_w - 98 * mm, size=7, color=MUTED, max_lines=1)

    checklist_y = stats_y - 85 * mm
    draw_text(c, "作業前に順番で確認", margin, stats_y - 8 * mm, content_w, font=FONT_BOLD, size=13, color=NAVY)
    check_items = [
        "高所作業を回避できるか",
        "作業床・端部・開口・昇降は適合しているか",
        "器具・教育記録は作業条件に合うか",
        "取付点・使用質量・落下距離・下方空間を照合したか",
        "器具と取付設備を点検したか",
        "救助方法・機材・担当者・連絡・中止条件を決めたか",
    ]
    row_h = 10.2 * mm
    for idx, item in enumerate(check_items):
        y = checklist_y + (len(check_items) - idx - 1) * row_h
        rounded_card(c, margin, y, content_w, row_h - 1.5 * mm, fill=WHITE, stroke=BORDER, radius=4)
        c.setStrokeColor(GREEN)
        c.setLineWidth(1.2)
        c.rect(margin + 4 * mm, y + 2.3 * mm, 4.5 * mm, 4.5 * mm, fill=0, stroke=1)
        draw_text(c, item, margin + 12 * mm, y + 7.3 * mm, content_w - 16 * mm, font=FONT_BOLD, size=8.8, max_lines=1)

    bottom_y = 18 * mm
    rounded_card(c, margin, bottom_y, content_w, 18 * mm, fill=RED_PALE, stroke=colors.HexColor("#F2B8B3"), radius=6)
    draw_text(c, "確認不能なら推測で開始しない。責任者へ連絡し、不適合を直した結果まで記録する。", margin + 5 * mm, bottom_y + 13 * mm, content_w - 10 * mm, font=FONT_BOLD, size=8.5, color=RED, max_lines=2, align="center")
    c.setFillColor(MUTED)
    c.setFont(FONT, 6.4)
    c.drawString(margin, 10 * mm, f"出典番号は sources.pdf に対応｜{BOUNDARY}")
    c.drawRightString(w - margin, 10 * mm, "1 / 1")
    c.save()


def build_field_checklist(output: Path) -> None:
    c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
    w, h = A4
    set_pdf_metadata(c, "現場確認チェックリスト")

    def header(page: int, title: str) -> float:
        c.setFillColor(PAPER)
        c.rect(0, 0, w, h, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.rect(0, h - 30 * mm, w, 30 * mm, fill=1, stroke=0)
        c.setFillColor(GREEN)
        c.rect(0, h - 5 * mm, w, 5 * mm, fill=1, stroke=0)
        draw_text(c, title, 14 * mm, h - 13 * mm, 150 * mm, font=FONT_BOLD, size=18, color=WHITE, max_lines=1)
        draw_text(c, "適・否・対象外だけで終わらせず、是正担当・期限・再確認を記録", 14 * mm, h - 23 * mm, 170 * mm, size=8.4, color=colors.HexColor("#D9E5EE"), max_lines=1)
        c.setFillColor(MUTED)
        c.setFont(FONT, 6.5)
        c.drawString(14 * mm, 9 * mm, f"{AS_OF_JA}｜{BOUNDARY}")
        c.drawRightString(w - 14 * mm, 9 * mm, f"{page} / 2")
        return h - 38 * mm

    y = header(1, "現場確認チェックリスト")
    labels = ["会社・現場", "工事・作業名", "確認日時", "確認者", "作業責任者", "作業高さ・場所"]
    cols = 2
    card_w = (w - 28 * mm - 4 * mm) / 2
    for idx, label in enumerate(labels):
        col, row = idx % cols, idx // cols
        x = 14 * mm + col * (card_w + 4 * mm)
        yy = y - (row + 1) * 17 * mm
        rounded_card(c, x, yy, card_w, 13 * mm, fill=WHITE, stroke=BORDER, radius=4)
        draw_text(c, label, x + 3 * mm, yy + 10 * mm, 26 * mm, font=FONT_BOLD, size=7.5, color=GREEN_DARK, max_lines=1)
        c.setStrokeColor(colors.HexColor("#9FABA8"))
        c.line(x + 29 * mm, yy + 4 * mm, x + card_w - 3 * mm, yy + 4 * mm)
    y -= 56 * mm

    headers = ["No.", "確認項目", "適", "否", "外", "根拠・現物・写真番号／不適合内容"]
    col_widths = [9 * mm, 70 * mm, 10 * mm, 10 * mm, 10 * mm, 63 * mm]
    c.setFillColor(GREEN)
    c.rect(14 * mm, y - 10 * mm, sum(col_widths), 10 * mm, fill=1, stroke=0)
    x = 14 * mm
    for label, cw in zip(headers, col_widths):
        draw_text(c, label, x, y - 2.2 * mm, cw, font=FONT_BOLD, size=6.6, color=WHITE, max_lines=2, align="center")
        x += cw
    items_page1 = [
        ("1", "地上組立、長柄工具、点検位置変更等で高所作業を回避できるか"),
        ("2", "作業床を設けられるか。困難の根拠と代替措置は妥当か"),
        ("3", "端部・開口部の囲い、手すり、覆い、防網等は適合しているか"),
        ("4", "覆いは固定・識別され、復旧確認者と再開条件が決まっているか"),
        ("5", "足場の床材・隙間・端部・昇降設備・点検記録は適合しているか"),
        ("6", "屋根の踏み抜き、端部、開口、昇降を分けて対策したか"),
        ("7", "脚立・はしごを安定した作業床へ置換できないか再検討したか"),
        ("8", "作業条件に必要な法定教育・資格・記録を確認したか"),
    ]
    row_h = 18.5 * mm
    for idx, (number, item) in enumerate(items_page1):
        ry = y - 10 * mm - (idx + 1) * row_h
        fill = WHITE if idx % 2 == 0 else colors.HexColor("#F1F5F3")
        c.setFillColor(fill)
        c.setStrokeColor(BORDER)
        c.rect(14 * mm, ry, sum(col_widths), row_h, fill=1, stroke=1)
        x = 14 * mm
        for cw in col_widths[:-1]:
            x += cw
            c.line(x, ry, x, ry + row_h)
        draw_text(c, number, 14 * mm, ry + 11 * mm, col_widths[0], font=FONT_BOLD, size=8, align="center")
        draw_text(c, item, 14 * mm + col_widths[0] + 3 * mm, ry + 15 * mm, col_widths[1] - 6 * mm, size=7.4, leading=10.5, max_lines=3)
        check_x = 14 * mm + col_widths[0] + col_widths[1]
        for box_idx in range(3):
            bx = check_x + box_idx * 10 * mm + 3 * mm
            c.rect(bx, ry + row_h / 2 - 2 * mm, 4 * mm, 4 * mm, fill=0, stroke=1)
    c.showPage()

    y = header(2, "現場確認チェックリスト（続き）")
    headers2 = headers
    c.setFillColor(GREEN)
    c.rect(14 * mm, y - 10 * mm, sum(col_widths), 10 * mm, fill=1, stroke=0)
    x = 14 * mm
    for label, cw in zip(headers2, col_widths):
        draw_text(c, label, x, y - 2.2 * mm, cw, font=FONT_BOLD, size=6.6, color=WHITE, max_lines=2, align="center")
        x += cw
    items_page2 = [
        ("9", "器具は使用質量、作業高さ、取付位置、ショックアブソーバ等に適合するか"),
        ("10", "取付設備の強度・位置・随時点検を確認したか"),
        ("11", "自由落下距離、器具表示の落下距離、実際の下方空間を照合したか"),
        ("12", "振られ、端部接触、床・梁・設備への衝突を評価したか"),
        ("13", "ベルト、縫製、金具、ランヤード、アブソーバ、巻取り器を使用前点検したか"),
        ("14", "定期点検記録、使用・保管・衝撃履歴を確認し、不適合品を隔離したか"),
        ("15", "未接続時間、急かされる工程、届かない取付点、器具混在を仕組みで防いだか"),
        ("16", "救助方法・機材・担当者・連絡・救助者保護・中止条件を確認したか"),
    ]
    row_h = 17 * mm
    for idx, (number, item) in enumerate(items_page2):
        ry = y - 10 * mm - (idx + 1) * row_h
        fill = WHITE if idx % 2 == 0 else colors.HexColor("#F1F5F3")
        c.setFillColor(fill)
        c.setStrokeColor(BORDER)
        c.rect(14 * mm, ry, sum(col_widths), row_h, fill=1, stroke=1)
        x = 14 * mm
        for cw in col_widths[:-1]:
            x += cw
            c.line(x, ry, x, ry + row_h)
        draw_text(c, number, 14 * mm, ry + 10 * mm, col_widths[0], font=FONT_BOLD, size=8, align="center")
        draw_text(c, item, 14 * mm + col_widths[0] + 3 * mm, ry + 14 * mm, col_widths[1] - 6 * mm, size=7.2, leading=10, max_lines=3)
        check_x = 14 * mm + col_widths[0] + col_widths[1]
        for box_idx in range(3):
            bx = check_x + box_idx * 10 * mm + 3 * mm
            c.rect(bx, ry + row_h / 2 - 2 * mm, 4 * mm, 4 * mm, fill=0, stroke=1)

    action_y = 22 * mm
    rounded_card(c, 14 * mm, action_y, w - 28 * mm, 37 * mm, fill=AMBER_PALE, stroke=colors.HexColor("#F2D18A"), radius=6)
    draw_text(c, "是正・中止・再確認", 18 * mm, action_y + 32 * mm, 60 * mm, font=FONT_BOLD, size=10, color=colors.HexColor("#7A3D00"), max_lines=1)
    lines = ["是正内容・担当：", "期限・作業再開条件：", "再確認日時・確認者："]
    for idx, label in enumerate(lines):
        yy = action_y + 24 * mm - idx * 8 * mm
        draw_text(c, label, 18 * mm, yy, 38 * mm, font=FONT_BOLD, size=7.2, color=NAVY, max_lines=1)
        c.setStrokeColor(colors.HexColor("#9F8D63"))
        c.line(55 * mm, yy - 3 * mm, w - 18 * mm, yy - 3 * mm)
    c.save()


def build_quiz(output: Path, quiz: dict[str, Any], source_index: dict[str, int], claims_by_id: dict[str, dict[str, Any]]) -> None:
    st = styles()
    doc = make_doc(output, "確認クイズ・解答解説")
    quiz_name = "確認クイズ"
    material_name = quiz["title"].removesuffix(f" {quiz_name}")
    quiz_title_style = ParagraphStyle(
        "QuizTitleJP",
        parent=st["h1"],
        fontSize=18,
        leading=24,
        spaceBefore=0,
        spaceAfter=10,
    )
    story: list[Any] = [
        p(material_name, st["title"]),
        p(quiz_name, quiz_title_style),
        p("参加者用問題", st["h1"]),
        p("各問、最も適切なものを1つ選んでください。", st["body"]),
    ]
    for idx, question in enumerate(quiz["questions"], start=1):
        block: list[Any] = [p(f"問{idx}　{question['question']}", st["h2"])]
        for choice_idx, choice in enumerate(question["choices"]):
            marker = "①②③④"[choice_idx]
            block.append(p(f"□ {marker} {choice}", st["body"]))
        story.append(KeepTogether(block))
        story.append(Spacer(1, 2 * mm))
        if idx in {2, 4}:
            story.append(PageBreak())
    story.extend([PageBreak(), p("解答・解説", st["title"])])
    for idx, question in enumerate(quiz["questions"], start=1):
        answer_marker = "①②③④"[question["correctIndex"]]
        source_ids: list[str] = []
        for claim_id in question["claimIds"]:
            for source_id in claims_by_id[claim_id]["sourceIds"]:
                if source_id not in source_ids:
                    source_ids.append(source_id)
        refs = " ".join(f"[{source_index[source_id]}]" for source_id in source_ids)
        block = [
            p(f"問{idx}　正解 {answer_marker}", st["h2"]),
            p(question["explanation"], st["body"]),
            p(f"Claim ID: {' / '.join(question['claimIds'])}", st["small"]),
            p(f"出典: {refs}", st["small"]),
        ]
        story.append(KeepTogether(block))
        story.append(Spacer(1, 3 * mm))
    story.append(Spacer(1, 4 * mm))
    story.append(p(BOUNDARY, st["h2"]))
    doc.build(story)


def build_sources(output: Path, registry: Sequence[dict[str, Any]]) -> None:
    st = styles()
    doc = make_doc(output, "出典一覧")
    story: list[Any] = [
        p("出典一覧", st["title"]),
        p("墜落・転落防止とフルハーネスの実務", st["h1"]),
        p("スライド、講師用台本、配布資料、チェックリスト、確認クイズの出典番号は本一覧に対応します。確認日はすべて基準日2026年8月27日です。", st["body"]),
    ]
    type_labels = {
        "law": "法令",
        "statistics": "統計",
        "government-guidance": "政府技術資料・行政ガイドライン",
        "scientific": "査読済み研究",
    }
    for index, source in enumerate(registry, start=1):
        published = source.get("publishedAt") or "記載なし"
        updated = source.get("updatedAt") or "記載なし"
        claims = " / ".join(source.get("claimIds", []))
        safe_url = html.escape(source["url"])
        block = [
            p(f"[{index}] {source['title']}", st["h2"]),
            Table(
                [
                    [p("区分", st["label"]), p(type_labels.get(source["sourceType"], source["sourceType"]), st["small"]), p("発行者", st["label"]), p(source["publisher"], st["small"])],
                    [p("公表日", st["label"]), p(published, st["small"]), p("更新日", st["label"]), p(updated, st["small"])],
                    [p("適用・対象日", st["label"]), p(source["applicableDate"], st["small"]), p("確定区分", st["label"]), p(source["finalOrPreliminary"], st["small"])],
                    [p("該当箇所", st["label"]), p(source["locator"], st["small"]), p("状態", st["label"]), p(source["status"], st["small"])],
                ],
                colWidths=[22 * mm, 55 * mm, 22 * mm, 75 * mm],
                style=TableStyle([("BACKGROUND", (0, 0), (0, -1), MINT), ("BACKGROUND", (2, 0), (2, -1), MINT), ("GRID", (0, 0), (-1, -1), 0.35, BORDER), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]),
            ),
            Paragraph(f"URL: <link href='{safe_url}' color='#075985'>{safe_url}</link>", st["small"]),
            p(f"Claim ID: {claims}", st["small"]),
            p(f"Checksum: {source['checksum']}", st["small"]),
            Spacer(1, 3 * mm),
        ]
        story.append(KeepTogether(block))
    doc.build(story)


def validate_inputs(
    training: dict[str, Any], claims: Sequence[dict[str, Any]], registry: Sequence[dict[str, Any]], quiz: dict[str, Any]
) -> tuple[dict[str, dict[str, Any]], dict[str, int]]:
    if training.get("slideCount") != 20 or len(training.get("slides", [])) != 20:
        raise ValueError("Canonical training must contain exactly 20 slides")
    if [slide["number"] for slide in training["slides"]] != list(range(1, 21)):
        raise ValueError("Slide numbers must be contiguous 1..20")
    claims_by_id = {claim["claimId"]: claim for claim in claims}
    source_index = {source["sourceId"]: index for index, source in enumerate(registry, start=1)}
    for slide in training["slides"]:
        for claim_id in slide.get("claimIds", []):
            if claim_id not in claims_by_id:
                raise ValueError(f"Unknown claim {claim_id} on slide {slide['number']}")
            for source_id in claims_by_id[claim_id].get("sourceIds", []):
                if source_id not in source_index:
                    raise ValueError(f"Unknown source {source_id} for claim {claim_id}")
    if len(quiz.get("questions", [])) != 5:
        raise ValueError("Quiz must contain exactly five questions")
    return claims_by_id, source_index


def build_all(output_dir: Path) -> list[Path]:
    training = load_json("fall-prevention.json")
    claims = load_json("claims.json")
    registry = load_json("source-registry.json")
    quiz = load_json("quiz.json")
    claims_by_id, source_index = validate_inputs(training, claims, registry, quiz)
    output_dir.mkdir(parents=True, exist_ok=True)
    # Remove only the obsolete filenames that predated the public-page naming
    # contract.  Keeping this here prevents stale links after future rebuilds.
    for legacy_name in (
        "instructor-script.pdf",
        "handout.pdf",
        "field-checklist.pdf",
        "quiz-and-answers.pdf",
        "sources.pdf",
    ):
        legacy_path = output_dir / legacy_name
        if legacy_path.is_file():
            legacy_path.unlink()
    outputs = [
        output_dir / "fall-prevention-training.pdf",
        output_dir / "fall-prevention-instructor-script.pdf",
        output_dir / "fall-prevention-handout.pdf",
        output_dir / "fall-prevention-field-checklist.pdf",
        output_dir / "fall-prevention-quiz-and-answers.pdf",
        output_dir / "fall-prevention-sources.pdf",
    ]
    build_slide_deck(outputs[0], training, claims_by_id, source_index)
    build_instructor_script(outputs[1], training, claims_by_id, source_index)
    draw_handout(outputs[2], training, claims_by_id, source_index)
    build_field_checklist(outputs[3])
    build_quiz(outputs[4], quiz, source_index, claims_by_id)
    build_sources(outputs[5], registry)
    return outputs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--only", choices=("quiz",), help="Regenerate only the affected artifact")
    args = parser.parse_args()
    output_dir = args.output_dir.resolve()
    if args.only == "quiz":
        training = load_json("fall-prevention.json")
        claims = load_json("claims.json")
        registry = load_json("source-registry.json")
        quiz = load_json("quiz.json")
        claims_by_id, source_index = validate_inputs(training, claims, registry, quiz)
        output_dir.mkdir(parents=True, exist_ok=True)
        outputs = [output_dir / "fall-prevention-quiz-and-answers.pdf"]
        build_quiz(outputs[0], quiz, source_index, claims_by_id)
    else:
        outputs = build_all(output_dir)
    for path in outputs:
        print(f"created {path} ({path.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
