"""Render the README's documented Jev response for the GitHub first screen."""

from __future__ import annotations

import hashlib
import json
import re
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw
from PIL.PngImagePlugin import PngInfo

from cards import FONTS, MINT, font, wrap


WIDTH, HEIGHT = 1200, 420
KINDS = ("State", "Choice", "Score", "Noul")


def parse_example(readme: str) -> tuple[str, dict[str, tuple[str, str]]]:
    marker = "| Input or answer | Documented value |"
    if readme.count(marker) != 1:
        raise ValueError("README needs one documented-response table")
    introduction = readme.split(marker, 1)[0].rstrip().split("\n\n")[-1]
    model = re.search(r"saved `(jev-[^`]+)` response", introduction)
    if not model:
        raise ValueError("Documented-response introduction needs the model version")
    rows = readme.split(marker, 1)[1].split("\n\n", 1)[0].splitlines()[2:]
    values: dict[str, tuple[str, str]] = {}
    for row in rows:
        cells = [cell.strip() for cell in row.strip().strip("|").split("|")]
        if len(cells) != 2 or cells[0] not in KINDS:
            raise ValueError(f"Invalid documented-response row: {row}")
        primary = re.search(r"`([^`]+)`", cells[1])
        if not primary or cells[0] in values:
            raise ValueError(f"Invalid documented-response value: {row}")
        detail = (cells[1][:primary.start()] + cells[1][primary.end():]).strip().removeprefix("· ").strip()
        detail = detail.replace("`", "")
        values[cells[0]] = (primary.group(1), detail)
    if tuple(values) != KINDS:
        raise ValueError("Documented-response rows must be State, Choice, Score, Noul")
    return model.group(1), values


def fingerprint(model: str, values: dict[str, tuple[str, str]]) -> str:
    digest = hashlib.sha256()
    digest.update(json.dumps([model, values], ensure_ascii=False).encode("utf-8"))
    digest.update(Image.__version__.encode("utf-8"))
    for path in (Path(__file__), Path(__file__).with_name("cards.py"), FONTS / "Inter.ttf", FONTS / "SpaceMono-Bold.ttf"):
        digest.update(path.read_bytes())
    return digest.hexdigest()


def card_matches(path: Path, model: str, values: dict[str, tuple[str, str]]) -> bool:
    try:
        with Image.open(path) as image:
            if image.format != "PNG" or image.size != (WIDTH, HEIGHT) or image.mode != "RGB":
                return False
            if image.info.get("source_sha256") != fingerprint(model, values):
                return False
            image.load()
    except (OSError, ValueError):
        return False
    return True


def render_card(model: str, values: dict[str, tuple[str, str]]) -> bytes:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#111b28")
    draw = ImageDraw.Draw(image)
    for x in range(0, WIDTH, 40):
        draw.line((x, 0, x, HEIGHT), fill="#20323d")
    for y in range(0, HEIGHT, 40):
        draw.line((0, y, WIDTH, y), fill="#20323d")
    draw.rounded_rectangle((14, 14, 1185, 405), radius=18, fill="#172530", outline="#648b82", width=2)
    draw.ellipse((36, 38, 48, 50), fill=MINT)
    draw.text((62, 36), f"DOCUMENTED RESPONSE / {model.upper()}", font=font(16, mono=True), fill=MINT)
    draw.text((36, 67), "One request. Three typed answers.", font=font(44, 750), fill="#f1f8f6")
    draw.text((38, 126), "Saved TypeSafe quick-start response. No model request is made here.", font=font(19), fill="#b0c0c8")

    draw.rounded_rectangle((36, 160, 1164, 244), radius=12, fill="#14202a", outline="#354c53", width=2)
    draw.text((54, 171), "INPUT / SUPPORT MESSAGE", font=font(15, mono=True), fill=MINT)
    for index, line in enumerate(wrap(draw, values["State"][0], font(18), 1092, 2)):
        draw.text((54, 195 + index * 22), line, font=font(18), fill="#d9e6e6")

    for index, kind in enumerate(KINDS[1:]):
        left = 36 + index * 376
        right = left + 360
        draw.rounded_rectangle((left, 260, right, 394), radius=12, fill="#1b3338", outline="#557873", width=2)
        primary, detail = values[kind]
        draw.text((left + 18, 276), kind.upper(), font=font(16, mono=True), fill="#8de8ee")
        draw.text((left + 18, 302), primary, font=font(42, 750), fill="#f1f8f6")
        for line_index, line in enumerate(wrap(draw, detail, font(17), 324, 2)):
            draw.text((left + 18, 348 + line_index * 21), line, font=font(17), fill="#b0c0c8")

    metadata = PngInfo()
    metadata.add_text("source_sha256", fingerprint(model, values))
    output = BytesIO()
    image.save(output, format="PNG", optimize=True, pnginfo=metadata)
    return output.getvalue()
