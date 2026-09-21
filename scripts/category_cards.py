"""Render share cards for README-derived community categories."""

from __future__ import annotations

import hashlib
import json
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw
from PIL.PngImagePlugin import PngInfo

from cards import FONTS, HEIGHT, MINT, WIDTH, font, wrap


def fingerprint(name: str, description: str, count: int) -> str:
    digest = hashlib.sha256()
    digest.update(json.dumps([name, description, count, Image.__version__], ensure_ascii=False).encode("utf-8"))
    digest.update(Path(__file__).read_bytes())
    for path in (FONTS / "Inter.ttf", FONTS / "SpaceMono-Bold.ttf"):
        digest.update(path.read_bytes())
    return digest.hexdigest()


def card_matches(path: Path, name: str, description: str, count: int) -> bool:
    try:
        with Image.open(path) as image:
            if image.format != "PNG" or image.size != (WIDTH, HEIGHT) or image.mode != "RGB":
                return False
            if image.info.get("source_sha256") != fingerprint(name, description, count):
                return False
            image.load()
    except (OSError, ValueError):
        return False
    return True


def render_card(name: str, description: str, count: int) -> bytes:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#111b28")
    draw = ImageDraw.Draw(image)
    for x in range(0, WIDTH, 40):
        draw.line((x, 0, x, HEIGHT), fill="#20323d")
    for y in range(0, HEIGHT, 40):
        draw.line((0, y, WIDTH, y), fill="#20323d")
    draw.rectangle((28, 28, 1171, 601), fill="#15202c", outline="#4e726f")
    draw.ellipse((58, 62, 70, 74), fill=MINT)
    draw.text((85, 60), "AWESOME JEV / EXPLORE A TOPIC", font=font(17, mono=True), fill=MINT)
    draw.line((48, 103, 1152, 103), fill="#354c53")

    count_label = f"{count:02d} COMMUNITY PROJECTS"
    count_face = font(17, mono=True)
    chip_width = int(draw.textlength(count_label, font=count_face)) + 32
    draw.rectangle((48, 129, 48 + chip_width, 166), fill="#1d383b", outline="#608d83")
    draw.text((64, 138), count_label, font=count_face, fill=MINT)

    title_face = font(67, 750)
    title_lines = wrap(draw, name, title_face, 1090, 2)
    title_top = 197 if len(title_lines) == 1 else 187
    for index, line in enumerate(title_lines):
        draw.text((48, title_top + index * 75), line, font=title_face, fill="#f1f8f6")

    summary_face = font(27)
    summary_top = 315 if len(title_lines) == 1 else 376
    for index, line in enumerate(wrap(draw, description, summary_face, 1080, 3 if len(title_lines) == 1 else 2)):
        draw.text((48, summary_top + index * 42), line, font=summary_face, fill="#bfd0d5")

    draw.line((48, 529, 1152, 529), fill="#354c53")
    draw.text((48, 547), "abdelstark.github.io/awesome-typesafe-jev", font=font(18, mono=True), fill=MINT)
    footer = "INDEPENDENT FIELD GUIDE"
    footer_face = font(16, mono=True)
    draw.text((1152 - draw.textlength(footer, font=footer_face), 549), footer, font=footer_face, fill="#a8b9c3")

    output = BytesIO()
    metadata = PngInfo()
    metadata.add_text("source_sha256", fingerprint(name, description, count))
    image.save(output, format="PNG", optimize=True, pnginfo=metadata)
    return output.getvalue()
