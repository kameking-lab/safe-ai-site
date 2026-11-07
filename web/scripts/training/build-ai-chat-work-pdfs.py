#!/usr/bin/env python3
"""Build the six AI chat-work PDF downloads from the AI seminar JSON canonicals."""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path
from typing import Any, Iterable, Sequence

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfdoc import PDFString
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


WEB_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = WEB_ROOT / "src" / "data" / "ai-seminars"
DEFAULT_OUTPUT_DIR = WEB_ROOT / "public" / "training" / "ai-seminars" / "ai-chat-work" / "downloads"
SLIDE_SIZE = (13.333 * 72, 7.5 * 72)

NAVY = colors.HexColor("#102A43")
NAVY_DARK = colors.HexColor("#071827")
INK = colors.HexColor("#172B3A")
TEAL = colors.HexColor("#0B6B66")
TEAL_DARK = colors.HexColor("#064E4A")
TEAL_SOFT = colors.HexColor("#D9EFEC")
SKY = colors.HexColor("#0369A1")
SKY_SOFT = colors.HexColor("#E5F4FC")
VIOLET = colors.HexColor("#6D28D9")
VIOLET_SOFT = colors.HexColor("#F0EAFE")
ORANGE = colors.HexColor("#F97316")
AMBER_SOFT = colors.HexColor("#FFF4D6")
RED = colors.HexColor("#B42318")
RED_SOFT = colors.HexColor("#FDEBE7")
MUTED = colors.HexColor("#526270")
BORDER = colors.HexColor("#D3DEE3")
PAPER = colors.HexColor("#F7F5EF")
WHITE = colors.white
CASE_NUMBERS = {5, 7, 9, 11, 13}


def load_json(name: str) -> Any:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


COURSE = load_json("ai-chat-work.json")
CLAIMS = load_json("claims.json")
SOURCES = load_json("source-registry.json")
QUIZ = load_json("quiz.json")
PROMPT_TEMPLATE = load_json("prompt-template.json")
CLAIM_MAP = {claim["claimId"]: claim for claim in CLAIMS}
SOURCE_NO = {source["sourceId"]: index for index, source in enumerate(SOURCES, start=1)}
AS_OF_JA = "基準日 " + "年".join(COURSE["asOf"].split("-", 1)).replace("-", "月") + "日"
BOUNDARY = COURSE["boundary"]


def register_fonts() -> tuple[str, str]:
    regular_candidates: Sequence[tuple[Path, int | None]] = (
        (Path(r"C:\Windows\Fonts\BIZ-UDGothicR.ttc"), 0),
        (Path(r"C:\Windows\Fonts\NotoSansJP-VF.ttf"), None),
        (Path(r"C:\Windows\Fonts\meiryo.ttc"), 0),
    )
    bold_candidates: Sequence[tuple[Path, int | None]] = (
        (Path(r"C:\Windows\Fonts\BIZ-UDGothicB.ttc"), 0),
        (Path(r"C:\Windows\Fonts\NotoSansJP-VF.ttf"), None),
        (Path(r"C:\Windows\Fonts\meiryob.ttc"), 0),
    )

    def register(name: str, candidates: Sequence[tuple[Path, int | None]]) -> str:
        errors: list[str] = []
        for font_path, subfont in candidates:
            if not font_path.exists():
                continue
            try:
                pdfmetrics.registerFont(TTFont(name, str(font_path), **({"subfontIndex": subfont} if subfont is not None else {})))
                return name
            except Exception as exc:  # pragma: no cover - platform fallback
                errors.append(f"{font_path.name}: {exc}")
        raise RuntimeError("Japanese font registration failed: " + " | ".join(errors))

    regular = register("AiTrainingJP", regular_candidates)
    bold = register("AiTrainingJP-Bold", bold_candidates)
    pdfmetrics.registerFontFamily("AiTrainingJP", normal=regular, bold=bold)
    return regular, bold


FONT, FONT_BOLD = register_fonts()


def validate_canonicals() -> None:
    if COURSE.get("version") != "2.0.0" or COURSE.get("asOf") != "2026-08-28":
        raise ValueError("Unexpected AI course version/date")
    slides = COURSE.get("slides", [])
    if COURSE.get("slideCount") != 20 or len(slides) != 20:
        raise ValueError("AI course must contain exactly 20 slides")
    if [slide["number"] for slide in slides] != list(range(1, 21)):
        raise ValueError("Slide numbers must be contiguous")
    for slide in slides:
        for claim_id in slide.get("claimIds", []):
            if claim_id not in CLAIM_MAP:
                raise ValueError(f"Unknown claim {claim_id} on slide {slide['number']}")
            for source_id in CLAIM_MAP[claim_id]["sourceIds"]:
                if source_id not in SOURCE_NO:
                    raise ValueError(f"Unknown source {source_id} for {claim_id}")
    for number in CASE_NUMBERS:
        joined = " ".join(slides[number - 1]["body"])
        required = ("出力例（架空・参考）", "人の確認点")
        if not any(label in joined for label in ("悪い依頼", "危険な依頼")) or not any(label in joined for label in ("改善プロンプト", "安全な書換え")) or not all(label in joined for label in required):
            raise ValueError(f"Slide {number} is missing a complete hands-on case")
    if len(COURSE.get("exercises", [])) != 3 or len(QUIZ.get("questions", [])) != 5 or len(PROMPT_TEMPLATE.get("caseTemplates", [])) != 5:
        raise ValueError("Expected 3 exercises, 5 quiz questions, and 5 case templates")


def set_metadata(c: canvas.Canvas, title: str) -> None:
    c.setTitle(title)
    c.setAuthor("安全AIポータル編集部")
    c.setCreator("安全AIポータル編集部")
    c.setSubject(BOUNDARY)
    c.setKeywords("AI実務研修, AIチャット, プロンプト, 一次資料確認")
    c._doc.Catalog.Lang = PDFString("ja-JP")


def wrap_text(text: str, font: str, size: float, width: float) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        if char == "\n":
            lines.append(current)
            current = ""
        elif current and pdfmetrics.stringWidth(current + char, font, size) > width:
            lines.append(current)
            current = char
        else:
            current += char
    if current or not lines:
        lines.append(current)
    return lines


def draw_text(c: canvas.Canvas, text: str, x: float, y_top: float, width: float, *, font: str = FONT, size: float = 16, color: colors.Color = INK, leading: float | None = None, max_lines: int | None = None, align: str = "left") -> float:
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


def card(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill: colors.Color = WHITE, stroke: colors.Color = BORDER, radius: float = 9) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def source_numbers(slide: dict[str, Any]) -> list[int]:
    result: list[int] = []
    for claim_id in slide.get("claimIds", []):
        for source_id in CLAIM_MAP[claim_id]["sourceIds"]:
            number = SOURCE_NO[source_id]
            if number not in result:
                result.append(number)
    return result


def slide_footer(c: canvas.Canvas, slide: dict[str, Any], dark: bool = False) -> None:
    w, _ = SLIDE_SIZE
    color = colors.HexColor("#D6E0EB") if dark else MUTED
    c.setStrokeColor(colors.HexColor("#4F6680") if dark else BORDER)
    c.line(36, 30, w - 36, 30)
    refs = " ".join(f"[{number}]" for number in source_numbers(slide)) or "教材内の架空例"
    c.setFillColor(color)
    c.setFont(FONT, 7.2)
    c.drawString(38, 16, f"出典 {refs}｜{AS_OF_JA}｜v{COURSE['version']}")
    c.drawRightString(w - 38, 16, f"{slide['number']} / 20")


def base_slide(c: canvas.Canvas, slide: dict[str, Any]) -> None:
    w, h = SLIDE_SIZE
    c.setFillColor(PAPER)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.rect(0, 0, 12, h, fill=1, stroke=0)
    draw_text(c, slide["kicker"], 52, h - 35, 520, font=FONT_BOLD, size=10, color=TEAL)
    draw_text(c, slide["label"], w - 220, h - 35, 170, font=FONT_BOLD, size=8.5, color=TEAL_DARK, align="right")
    draw_text(c, slide["title"], 52, h - 70, w - 104, font=FONT_BOLD, size=25, color=NAVY, max_lines=2)
    c.setFillColor(ORANGE)
    c.rect(52, h - 106, 70, 4, fill=1, stroke=0)
    draw_text(c, slide["message"], 52, h - 122, w - 104, font=FONT_BOLD, size=13.2, color=INK, max_lines=2)


def strip_label(text: str) -> str:
    labels = ("悪い依頼：", "危険な依頼：", "改善プロンプト：", "安全な書換え：", "出力例（架空・参考）：", "人の確認点：")
    for label in labels:
        if text.startswith(label):
            return text[len(label) :]
    return text


def draw_case(c: canvas.Canvas, slide: dict[str, Any]) -> None:
    w, h = SLIDE_SIZE
    body = slide["body"]
    specs = (
        ("悪い依頼", strip_label(body[0]), 52, h - 245, 410, 76, RED_SOFT, RED, 9.5),
        ("改善した具体的プロンプト", strip_label(body[1]), 52, h - 404, 410, 145, SKY_SOFT, SKY, 9.3),
        ("短い出力例（架空・参考）", strip_label(body[2]), 496, h - 285, 410, 116, VIOLET_SOFT, VIOLET, 10.2),
        ("人が確認する点", strip_label(body[3]), 496, h - 404, 410, 105, AMBER_SOFT, ORANGE, 10.2),
    )
    for label, text, x, y, width, height, fill, accent, size in specs:
        card(c, x, y, width, height, fill)
        c.setFillColor(accent)
        c.rect(x, y, 6, height, fill=1, stroke=0)
        draw_text(c, label, x + 17, y + height - 12, width - 30, font=FONT_BOLD, size=8.5, color=accent, max_lines=1)
        draw_text(c, text, x + 17, y + height - 32, width - 32, font=FONT_BOLD if height < 100 else FONT, size=size, color=INK, max_lines=6)


def draw_steps(c: canvas.Canvas, slide: dict[str, Any]) -> None:
    w, h = SLIDE_SIZE
    steps = slide["visual"]["steps"]
    gap = 12
    width = (w - 104 - gap * (len(steps) - 1)) / len(steps)
    for index, step in enumerate(steps):
        x = 52 + index * (width + gap)
        card(c, x, h - 405, width, 220, WHITE)
        c.setFillColor((TEAL, SKY, VIOLET, ORANGE)[index % 4])
        c.circle(x + width / 2, h - 228, 18, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(FONT_BOLD, 13)
        c.drawCentredString(x + width / 2, h - 233, str(index + 1))
        draw_text(c, step["label"], x + 10, h - 272, width - 20, font=FONT_BOLD, size=13, color=NAVY, max_lines=2, align="center")
        draw_text(c, step["detail"], x + 13, h - 325, width - 26, size=9.5, color=MUTED, max_lines=4, align="center")
    if slide.get("body"):
        draw_text(c, "　｜　".join(slide["body"]), 52, h - 438, w - 104, size=8.5, color=MUTED, max_lines=3)


def draw_checklist(c: canvas.Canvas, slide: dict[str, Any]) -> None:
    w, h = SLIDE_SIZE
    items = slide["visual"]["items"]
    for index, item in enumerate(items):
        col = index // ((len(items) + 1) // 2)
        row = index % ((len(items) + 1) // 2)
        x = 52 + col * 455
        y_top = h - 204 - row * 68
        c.setFillColor(TEAL)
        c.circle(x + 13, y_top - 13, 11, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(FONT_BOLD, 10)
        c.drawCentredString(x + 13, y_top - 17, "✓")
        draw_text(c, item, x + 34, y_top, 400, font=FONT_BOLD, size=10.5, color=INK, max_lines=3)
    if slide.get("body"):
        draw_text(c, "　｜　".join(slide["body"]), 52, 76, w - 104, size=8.5, color=MUTED, max_lines=3)


def build_slide_deck(output: Path) -> None:
    c = canvas.Canvas(str(output), pagesize=SLIDE_SIZE, pageCompression=1)
    set_metadata(c, COURSE["title"])
    w, h = SLIDE_SIZE
    for slide in COURSE["slides"]:
        if slide["number"] in (1, 20):
            c.setFillColor(NAVY_DARK)
            c.rect(0, 0, w, h, fill=1, stroke=0)
            c.setFillColor(ORANGE)
            c.rect(0, 0, 14, h, fill=1, stroke=0)
            draw_text(c, slide["kicker"], 62, h - 58, 600, font=FONT_BOLD, size=14, color=TEAL_SOFT)
            draw_text(c, slide["title"], 62, h - 115, w - 124, font=FONT_BOLD, size=36 if slide["number"] == 1 else 31, color=WHITE, max_lines=2)
            draw_text(c, slide["message"], 64, h - 190, w - 128, font=FONT_BOLD, size=15, color=colors.HexColor("#E2F4F1"), max_lines=3)
            steps = slide["visual"]["steps"]
            gap = 16
            box_w = (w - 128 - gap * (len(steps) - 1)) / len(steps)
            for index, step in enumerate(steps):
                x = 64 + index * (box_w + gap)
                card(c, x, 140, box_w, 116, (TEAL, SKY, ORANGE)[index % 3], (TEAL, SKY, ORANGE)[index % 3])
                draw_text(c, step["label"], x + 12, 232, box_w - 24, font=FONT_BOLD, size=14, color=WHITE, align="center")
                draw_text(c, step["detail"], x + 14, 196, box_w - 28, size=10, color=WHITE, max_lines=3, align="center")
            draw_text(c, "　｜　".join(slide["body"]), 64, 100, w - 128, size=9.5, color=colors.HexColor("#C6E7E3"), max_lines=3)
            slide_footer(c, slide, dark=True)
        else:
            base_slide(c, slide)
            if slide["number"] in CASE_NUMBERS:
                draw_case(c, slide)
            elif slide["visual"]["type"] == "checklist":
                draw_checklist(c, slide)
            else:
                draw_steps(c, slide)
            slide_footer(c, slide)
        c.showPage()
    c.save()


def styles() -> dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("AiTitle", parent=sample["Title"], fontName=FONT_BOLD, fontSize=22, leading=29, textColor=NAVY, spaceAfter=12),
        "h1": ParagraphStyle("AiH1", parent=sample["Heading1"], fontName=FONT_BOLD, fontSize=15, leading=21, textColor=TEAL_DARK, spaceBefore=10, spaceAfter=7),
        "h2": ParagraphStyle("AiH2", parent=sample["Heading2"], fontName=FONT_BOLD, fontSize=11.5, leading=17, textColor=NAVY, spaceBefore=8, spaceAfter=5),
        "body": ParagraphStyle("AiBody", parent=sample["BodyText"], fontName=FONT, fontSize=9.2, leading=14.2, textColor=INK, spaceAfter=5, wordWrap="CJK"),
        "small": ParagraphStyle("AiSmall", parent=sample["BodyText"], fontName=FONT, fontSize=7.2, leading=10.5, textColor=MUTED, spaceAfter=3, wordWrap="CJK"),
        "label": ParagraphStyle("AiLabel", parent=sample["BodyText"], fontName=FONT_BOLD, fontSize=8, leading=11, textColor=TEAL_DARK, wordWrap="CJK"),
    }


def page_number(canvas_obj: canvas.Canvas, doc: SimpleDocTemplate) -> None:
    canvas_obj.saveState()
    canvas_obj.setFont(FONT, 7)
    canvas_obj.setFillColor(MUTED)
    canvas_obj.drawString(15 * mm, 9 * mm, f"安全AIポータル｜{AS_OF_JA}｜v{COURSE['version']}")
    canvas_obj.drawRightString(A4[0] - 15 * mm, 9 * mm, str(doc.page))
    canvas_obj.restoreState()


def make_doc(output: Path, title: str) -> SimpleDocTemplate:
    return SimpleDocTemplate(str(output), pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=15 * mm, bottomMargin=16 * mm, title=title, author="安全AIポータル編集部", subject=BOUNDARY)


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(html.escape(str(text)).replace("\n", "<br/>"), style)


def claim_refs(claim_ids: Iterable[str]) -> str:
    numbers: list[int] = []
    for claim_id in claim_ids:
        for source_id in CLAIM_MAP[claim_id]["sourceIds"]:
            number = SOURCE_NO[source_id]
            if number not in numbers:
                numbers.append(number)
    return " ".join(f"[{number}]" for number in numbers)


def build_instructor_script(output: Path) -> None:
    st = styles()
    story: list[Any] = [p("講師用台本", st["title"]), p(COURSE["title"], st["h1"]), p(f"20枚・推定ナレーション {sum(s['estimatedSeconds'] for s in COURSE['slides']) // 60}分10秒。架空例を使い、実在情報を入力させないでください。", st["body"]), p(BOUNDARY, st["body"])]
    for slide in COURSE["slides"]:
        story.extend([
            p(f"スライド{slide['number']}　{slide['title']}（目安 {slide['estimatedSeconds']}秒）", st["h1"]),
            p(slide["message"], st["h2"]),
            p(slide["narration"], st["body"]),
            p("講師補足", st["h2"]),
            *[p(f"・{note}", st["body"]) for note in slide.get("instructorNotes", [])],
            p(f"Claim: {' / '.join(slide.get('claimIds', [])) or 'なし'}　出典: {claim_refs(slide.get('claimIds', [])) or '教材内の架空例'}", st["small"]),
        ])
    make_doc(output, "AIチャット仕事術 講師用台本").build(story, onFirstPage=page_number, onLaterPages=page_number)


def build_handout(output: Path) -> None:
    c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
    set_metadata(c, "AIチャット仕事術 参加者配布用1枚資料")
    w, h = A4
    c.setFillColor(PAPER)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(NAVY_DARK)
    c.rect(0, h - 40 * mm, w, 40 * mm, fill=1, stroke=0)
    draw_text(c, "AIチャット仕事術", 15 * mm, h - 14 * mm, 150 * mm, font=FONT_BOLD, size=20, color=WHITE)
    draw_text(c, "頼む → 比べる → 人が確定する", 15 * mm, h - 27 * mm, 170 * mm, font=FONT_BOLD, size=10, color=TEAL_SOFT)
    y = h - 49 * mm
    draw_text(c, "そのまま使える4行", 15 * mm, y, 80 * mm, font=FONT_BOLD, size=12, color=TEAL_DARK)
    rows = [("目的", "誰が何に使う下書きか"), ("材料", "使ってよい確定事実と未定事項"), ("完成形", "件名・本文・表・長さ"), ("条件", "推測禁止、未確認表示、人の確認点")]
    for index, (label, text) in enumerate(rows):
        top = y - 9 * mm - index * 13 * mm
        card(c, 15 * mm, top - 10 * mm, 82 * mm, 10 * mm, TEAL_SOFT if index % 2 == 0 else SKY_SOFT)
        draw_text(c, label, 19 * mm, top - 1.5 * mm, 18 * mm, font=FONT_BOLD, size=8, color=TEAL_DARK)
        draw_text(c, text, 38 * mm, top - 1.5 * mm, 55 * mm, size=7.7, color=INK, max_lines=2)
    draw_text(c, "5つの業務で見る確認点", 105 * mm, y, 88 * mm, font=FONT_BOLD, size=12, color=TEAL_DARK)
    for index, case in enumerate(PROMPT_TEMPLATE["caseTemplates"]):
        top = y - 8 * mm - index * 13 * mm
        draw_text(c, case["title"], 105 * mm, top, 40 * mm, font=FONT_BOLD, size=8, color=NAVY, max_lines=2)
        draw_text(c, "／".join(case["humanChecks"]), 145 * mm, top, 48 * mm, size=6.8, color=MUTED, max_lines=3)
    y2 = h - 124 * mm
    draw_text(c, "一次資料調査の確認順", 15 * mm, y2, 90 * mm, font=FONT_BOLD, size=12, color=TEAL_DARK)
    sequence = ["発行主体を限定", "文書名・版・日付", "公式本文を開く", "該当箇所と文脈", "未確認を残す"]
    for index, text in enumerate(sequence):
        x = 15 * mm + index * 36 * mm
        c.setFillColor((TEAL, SKY, VIOLET, ORANGE, RED)[index])
        c.circle(x + 4 * mm, y2 - 12 * mm, 4 * mm, fill=1, stroke=0)
        draw_text(c, str(index + 1), x, y2 - 9.5 * mm, 8 * mm, font=FONT_BOLD, size=7, color=WHITE, align="center")
        draw_text(c, text, x - 5 * mm, y2 - 20 * mm, 28 * mm, font=FONT_BOLD, size=6.8, color=INK, max_lines=3, align="center")
    y3 = h - 166 * mm
    draw_text(c, "入力前・利用前チェック", 15 * mm, y3, 90 * mm, font=FONT_BOLD, size=12, color=TEAL_DARK)
    checks = PROMPT_TEMPLATE["safeUseNotes"]
    for index, text in enumerate(checks):
        yy = y3 - 10 * mm - index * 13 * mm
        c.setStrokeColor(TEAL)
        c.rect(16 * mm, yy - 3 * mm, 4 * mm, 4 * mm, fill=0, stroke=1)
        draw_text(c, text, 24 * mm, yy + 1 * mm, 168 * mm, font=FONT_BOLD, size=7.5, color=INK, max_lines=2)
    card(c, 15 * mm, 18 * mm, 180 * mm, 18 * mm, RED_SOFT, colors.HexColor("#F2B8B3"))
    draw_text(c, "AI出力は架空の参考例。送信・公開・意思決定は人が行う。", 20 * mm, 31 * mm, 170 * mm, font=FONT_BOLD, size=9, color=RED, align="center")
    draw_text(c, f"{AS_OF_JA}｜{BOUNDARY}", 15 * mm, 11 * mm, 180 * mm, size=6.2, color=MUTED, align="center")
    c.save()


def build_prompt_template(output: Path) -> None:
    st = styles()
    story: list[Any] = [p(PROMPT_TEMPLATE["title"], st["title"]), p(PROMPT_TEMPLATE["description"], st["body"]), p("共通ひな型", st["h1"]), p(PROMPT_TEMPLATE["copyTemplate"], st["body"])]
    for case in PROMPT_TEMPLATE["caseTemplates"]:
        rows = [
            [p("業務場面", st["label"]), p(case["scene"], st["body"])],
            [p("コピー用プロンプト", st["label"]), p(case["prompt"], st["body"])],
            [p("人の確認点", st["label"]), p("／".join(case["humanChecks"]), st["body"])],
        ]
        table = Table(rows, colWidths=[31 * mm, 145 * mm], style=TableStyle([("BACKGROUND", (0, 0), (0, -1), TEAL_SOFT), ("GRID", (0, 0), (-1, -1), 0.4, BORDER), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
        story.extend([KeepTogether([p(case["title"], st["h1"]), table]), Spacer(1, 3 * mm)])
    story.extend([p("安全に使う前提", st["h1"]), *[p(f"・{item}", st["body"]) for item in PROMPT_TEMPLATE["safeUseNotes"]], p(BOUNDARY, st["small"])])
    make_doc(output, "AI依頼テンプレート").build(story, onFirstPage=page_number, onLaterPages=page_number)


def build_quiz(output: Path) -> None:
    st = styles()
    story: list[Any] = [p(QUIZ["title"], st["title"]), p("参加者用問題：最も適切なものを1つ選んでください。", st["body"])]
    for index, question in enumerate(QUIZ["questions"], start=1):
        block: list[Any] = [p(f"問{index}　{question['question']}", st["h1"])]
        for choice_index, choice in enumerate(question["choices"]):
            block.append(p(f"□ {'①②③④'[choice_index]} {choice}", st["body"]))
        story.append(KeepTogether(block))
        story.append(Spacer(1, 2 * mm))
    story.extend([PageBreak(), p("解答・解説", st["title"])])
    for index, question in enumerate(QUIZ["questions"], start=1):
        answer = "①②③④"[question["correctIndex"]]
        story.extend([p(f"問{index}　正解 {answer}", st["h1"]), p(question["explanation"], st["body"]), p(f"Claim: {' / '.join(question['claimIds'])}　出典: {claim_refs(question['claimIds'])}", st["small"])])
    make_doc(output, "AIチャット仕事術 確認クイズ・解答解説").build(story, onFirstPage=page_number, onLaterPages=page_number)


def build_sources(output: Path) -> None:
    st = styles()
    story: list[Any] = [p("出典一覧", st["title"]), p(COURSE["title"], st["h1"]), p("Web、スライド、台本、配布物、クイズの番号は本一覧に対応します。製品仕様やガイドラインは利用時にも最新版を確認してください。", st["body"])]
    for index, source in enumerate(SOURCES, start=1):
        url = html.escape(source["url"])
        rows = [
            [p("発行者", st["label"]), p(source["publisher"], st["small"]), p("確認日", st["label"]), p(source["checkedAt"], st["small"])],
            [p("公表日", st["label"]), p(source.get("publishedAt") or "記載なし", st["small"]), p("更新日", st["label"]), p(source.get("updatedAt") or "記載なし", st["small"])],
            [p("該当箇所", st["label"]), p(source["locator"], st["small"]), p("Claim", st["label"]), p(" / ".join(source["claimIds"]), st["small"])],
        ]
        table = Table(rows, colWidths=[20 * mm, 58 * mm, 20 * mm, 78 * mm], style=TableStyle([("BACKGROUND", (0, 0), (0, -1), TEAL_SOFT), ("BACKGROUND", (2, 0), (2, -1), TEAL_SOFT), ("GRID", (0, 0), (-1, -1), 0.35, BORDER), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story.extend([KeepTogether([p(f"[{index}] {source['title']}", st["h1"]), table, Paragraph(f"URL: <link href='{url}' color='#0369A1'>{url}</link>", st["small"]), p(f"Checksum: {source['checksum']}", st["small"])]), Spacer(1, 3 * mm)])
    make_doc(output, "AIチャット仕事術 出典一覧").build(story, onFirstPage=page_number, onLaterPages=page_number)


def build_all(output_dir: Path) -> list[Path]:
    validate_canonicals()
    output_dir.mkdir(parents=True, exist_ok=True)
    outputs = [
        output_dir / "ai-chat-work-training.pdf",
        output_dir / "ai-chat-work-instructor-script.pdf",
        output_dir / "ai-chat-work-handout.pdf",
        output_dir / "ai-chat-work-prompt-template.pdf",
        output_dir / "ai-chat-work-quiz-and-answers.pdf",
        output_dir / "ai-chat-work-sources.pdf",
    ]
    build_slide_deck(outputs[0])
    build_instructor_script(outputs[1])
    build_handout(outputs[2])
    build_prompt_template(outputs[3])
    build_quiz(outputs[4])
    build_sources(outputs[5])
    return outputs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()
    outputs = build_all(args.output_dir.resolve())
    for output in outputs:
        print(f"created {output} ({output.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
