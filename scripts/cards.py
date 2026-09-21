"""Render social preview cards from the canonical README-derived directory."""

from __future__ import annotations

import hashlib
import json
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from PIL.PngImagePlugin import PngInfo


FONTS = Path(__file__).with_name("fonts")
WIDTH, HEIGHT = 1200, 630
MINT = "#b9f6d6"


def fingerprint(name: str, category: str, description: str) -> str:
    digest = hashlib.sha256()
    digest.update(json.dumps([name, category, description, Image.__version__], ensure_ascii=False).encode("utf-8"))
    digest.update(Path(__file__).read_bytes())
    for path in (FONTS / "Inter.ttf", FONTS / "SpaceMono-Bold.ttf"):
        digest.update(path.read_bytes())
    return digest.hexdigest()


def card_matches(path: Path, name: str, category: str, description: str) -> bool:
    try:
        with Image.open(path) as image:
            if image.format != "PNG" or image.size != (WIDTH, HEIGHT) or image.mode != "RGB":
                return False
            if image.info.get("source_sha256") != fingerprint(name, category, description):
                return False
            image.load()
    except (OSError, ValueError):
        return False
    return True


def font(size: int, weight: int = 400, *, mono: bool = False) -> ImageFont.FreeTypeFont:
    path = FONTS / ("SpaceMono-Bold.ttf" if mono else "Inter.ttf")
    face = ImageFont.truetype(path, size)
    if not mono:
        face.set_variation_by_axes([14, weight])
    return face


def wrap(draw: ImageDraw.ImageDraw, value: str, face: ImageFont.FreeTypeFont,
         width: int, limit: int) -> list[str]:
    words = value.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}" if current else word
        if current and draw.textlength(candidate, font=face) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    if len(lines) <= limit and all(draw.textlength(line, font=face) <= width for line in lines):
        return lines
    shown = lines[:limit]
    if not shown:
        return shown
    last = shown[-1]
    while last and draw.textlength(f"{last}…", font=face) > width:
        last = last[:-1]
    shown[-1] = f"{last.rstrip()}…"
    return shown


def render_card(name: str, category: str, description: str) -> bytes:
    """Return a 1200 by 630 PNG suitable for link previews and downloads."""
    image = Image.new("RGB", (WIDTH, HEIGHT), "#111b28")
    draw = ImageDraw.Draw(image)
    for x in range(0, WIDTH, 40):
        draw.line((x, 0, x, HEIGHT), fill="#20323d")
    for y in range(0, HEIGHT, 40):
        draw.line((0, y, WIDTH, y), fill="#20323d")
    draw.rectangle((28, 28, 1171, 601), fill="#15202c", outline="#4e726f")
    draw.ellipse((58, 62, 70, 74), fill=MINT)
    draw.text((85, 60), "AWESOME JEV / COMMUNITY LISTING", font=font(17, mono=True), fill=MINT)
    draw.line((48, 103, 1152, 103), fill="#354c53")

    category_face = font(17, mono=True)
    category_label = category.upper()
    chip_width = min(1090, int(draw.textlength(category_label, font=category_face)) + 32)
    draw.rectangle((48, 129, 48 + chip_width, 166), fill="#1d383b", outline="#608d83")
    draw.text((64, 138), category_label, font=category_face, fill=MINT)

    title_face = font(67, 750)
    title_lines = wrap(draw, name, title_face, 1090, 2)
    for size in range(66, 43, -1):
        if all(draw.textlength(line, font=title_face) <= 1090 for line in title_lines):
            break
        title_face = font(size, 750)
        title_lines = wrap(draw, name, title_face, 1090, 2)
    title_top = 199 if len(title_lines) == 1 else 190
    for index, line in enumerate(title_lines):
        draw.text((48, title_top + index * 75), line, font=title_face, fill="#f1f8f6")

    summary_face = font(28)
    summary_lines = wrap(draw, description, summary_face, 1080, 3 if len(title_lines) == 1 else 2)
    summary_top = 316 if len(title_lines) == 1 else 378
    for index, line in enumerate(summary_lines):
        draw.text((48, summary_top + index * 42), line, font=summary_face, fill="#bfd0d5")

    draw.line((48, 529, 1152, 529), fill="#354c53")
    draw.text((48, 547), "abdelstark.github.io/awesome-typesafe-jev", font=font(18, mono=True), fill=MINT)
    footer = "LISTED, NOT ENDORSED"
    footer_face = font(16, mono=True)
    draw.text((1152 - draw.textlength(footer, font=footer_face), 549), footer, font=footer_face, fill="#a8b9c3")

    output = BytesIO()
    metadata = PngInfo()
    metadata.add_text("source_sha256", fingerprint(name, category, description))
    image.save(output, format="PNG", optimize=True, pnginfo=metadata)
    return output.getvalue()
