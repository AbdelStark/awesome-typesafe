#!/usr/bin/env python3
"""Export the community directory from its canonical README entries."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

from cards import card_matches, render_card
from category_cards import card_matches as category_card_matches, render_card as render_category_card
from check import github_slug


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
OUTPUT = ROOT / "resources.json"
PROJECTS_DIR = ROOT / "projects"
CATEGORIES_DIR = ROOT / "categories"
CARDS_DIR = ROOT / "assets" / "cards"
CATEGORY_CARDS_DIR = ROOT / "assets" / "category-cards"
ENTRY = re.compile(r"^- \[([^]]+)]\((https://[^)]+)\) — (.+)$")


def project_slug(url: str) -> str:
    parsed = urlsplit(url)
    host = (parsed.hostname or "").lower()
    path = parsed.path.strip("/").replace("/", "-")
    raw = f"gh-{path}" if host in {"github.com", "www.github.com"} else f"site-{host.removeprefix('www.').replace('.', '-')}-{path}"
    return re.sub(r"[^a-z0-9]+", "-", raw.lower()).strip("-")


def plain_description(markdown: str) -> str:
    text = re.sub(r"\[([^]]+)]\(https?://[^)]+\)", r"\1", markdown)
    text = re.sub(r"[`*]", "", text)
    return re.sub(r"(?<!\w)_(?=\S)|(?<=\S)_(?!\w)", "", text)


def build_document() -> dict[str, object]:
    source = README.read_text(encoding="utf-8")
    updated = re.search(r"^Last updated: (\d{4}-\d{2}-\d{2})\.", source, re.M)
    if not updated:
        raise ValueError("README.md needs a Last updated date")
    community = source.split("## Community projects\n", 1)[1].split("## Contributing\n", 1)[0]
    categories: list[dict[str, object]] = []
    for line in community.splitlines():
        if line.startswith("### "):
            name = line[4:]
            slug = github_slug(name)
            categories.append({
                "id": slug,
                "name": name,
                "description": "",
                "permalink": f"/categories/{slug}/",
                "resources": [],
            })
        elif line.startswith("- "):
            match = ENTRY.fullmatch(line)
            if not match or not categories:
                raise ValueError(f"Invalid community entry: {line}")
            name, url, description = match.groups()
            categories[-1]["resources"].append({
                "name": name,
                "url": url,
                "description_markdown": description,
                "permalink": f"/projects/{project_slug(url)}/",
            })
        elif line.strip() and categories:
            category = categories[-1]
            if category["description"] or category["resources"]:
                raise ValueError(f"Unexpected text in community category {category['name']}: {line}")
            category["description"] = line.strip()
    if not categories or any(not category["description"] or not category["resources"] for category in categories):
        raise ValueError("Every community category needs an introduction and resources")
    total = sum(len(category["resources"]) for category in categories)
    return {
        "schema_version": 2,
        "source": "https://github.com/AbdelStark/awesome-typesafe-jev/blob/main/README.md",
        "last_updated": updated.group(1),
        "total_resources": total,
        "notice": "Community entries are independent unless their source says otherwise. Inclusion is not endorsement.",
        "categories": categories,
    }


def build_pages(document: dict[str, object]) -> dict[Path, str]:
    pages: dict[Path, str] = {}
    for category in document["categories"]:
        resources = category["resources"]
        for index, resource in enumerate(resources):
            related = [
                resources[(index + offset) % len(resources)]
                for offset in range(1, min(4, len(resources)))
            ]
            metadata = {
                "layout": "resource",
                "title": f"{resource['name']} | Awesome Jev",
                "description": plain_description(resource["description_markdown"]),
                "permalink": resource["permalink"],
                "resource_name": resource["name"],
                "resource_slug": project_slug(resource["url"]),
                "resource_url": resource["url"],
                "description_markdown": resource["description_markdown"],
                "category_name": category["name"],
                "category_id": category["id"],
                "social_image": f"/assets/cards/{project_slug(resource['url'])}.png",
            }
            lines = ["---"] + [
                f"{key}: {json.dumps(value, ensure_ascii=False)}"
                for key, value in metadata.items()
            ]
            lines.append("related:")
            for other in related:
                lines.append(f"  - name: {json.dumps(other['name'], ensure_ascii=False)}")
                lines.append(f"    permalink: {json.dumps(other['permalink'], ensure_ascii=False)}")
                lines.append(f"    description: {json.dumps(plain_description(other['description_markdown']), ensure_ascii=False)}")
                lines.append(f"    image: {json.dumps('/assets/cards/' + project_slug(other['url']) + '.png', ensure_ascii=False)}")
            lines.extend(["---", ""])
            slug = resource["permalink"].strip("/").split("/")[-1]
            path = PROJECTS_DIR / f"{slug}.html"
            if path in pages:
                raise ValueError(f"Project permalink collision: {resource['permalink']}")
            pages[path] = "\n".join(lines)
    return pages


def build_category_pages(document: dict[str, object]) -> dict[Path, str]:
    pages: dict[Path, str] = {}
    for category in document["categories"]:
        metadata = {
            "layout": "category",
            "title": f"{category['name']} | Awesome Jev",
            "description": category["description"],
            "permalink": category["permalink"],
            "category_name": category["name"],
            "category_id": category["id"],
            "social_image": f"/assets/category-cards/{category['id']}.png",
        }
        lines = ["---"] + [
            f"{key}: {json.dumps(value, ensure_ascii=False)}"
            for key, value in metadata.items()
        ]
        lines.append("resources:")
        for resource in category["resources"]:
            lines.append(f"  - name: {json.dumps(resource['name'], ensure_ascii=False)}")
            lines.append(f"    url: {json.dumps(resource['url'], ensure_ascii=False)}")
            lines.append(f"    description: {json.dumps(plain_description(resource['description_markdown']), ensure_ascii=False)}")
            lines.append(f"    permalink: {json.dumps(resource['permalink'], ensure_ascii=False)}")
            lines.append(f"    image: {json.dumps('/assets/cards/' + project_slug(resource['url']) + '.png', ensure_ascii=False)}")
        lines.extend(["---", ""])
        path = CATEGORIES_DIR / f"{category['id']}.html"
        pages[path] = "\n".join(lines)
    return pages


def card_specs(document: dict[str, object]) -> dict[Path, tuple[str, str, str]]:
    cards: dict[Path, tuple[str, str, str]] = {}
    for category in document["categories"]:
        for resource in category["resources"]:
            path = CARDS_DIR / f"{project_slug(resource['url'])}.png"
            if path in cards:
                raise ValueError(f"Project card collision: {resource['url']}")
            cards[path] = (
                resource["name"],
                category["name"],
                plain_description(resource["description_markdown"]),
            )
    return cards


def category_card_specs(document: dict[str, object]) -> dict[Path, tuple[str, str, int]]:
    return {
        CATEGORY_CARDS_DIR / f"{category['id']}.png": (
            category["name"], category["description"], len(category["resources"])
        )
        for category in document["categories"]
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if README-derived artifacts are stale")
    args = parser.parse_args()
    try:
        document = build_document()
        generated = json.dumps(document, ensure_ascii=False, indent=2) + "\n"
        pages = build_pages(document)
        category_pages = build_category_pages(document)
        cards = card_specs(document)
        category_cards = category_card_specs(document)
    except (IndexError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    if args.check:
        actual_pages = set(PROJECTS_DIR.glob("*.html"))
        actual_category_pages = set(CATEGORIES_DIR.glob("*.html"))
        actual_cards = set(CARDS_DIR.glob("*.png"))
        actual_category_cards = set(CATEGORY_CARDS_DIR.glob("*.png"))
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != generated or actual_pages != set(pages) or any(
            path.read_text(encoding="utf-8") != content for path, content in pages.items()
        ) or actual_category_pages != set(category_pages) or any(
            path.read_text(encoding="utf-8") != content for path, content in category_pages.items()
        ) or actual_cards != set(cards) or any(not card_matches(path, *spec) for path, spec in cards.items()) or actual_category_cards != set(category_cards) or any(
            not category_card_matches(path, *spec) for path, spec in category_cards.items()
        ):
            print("ERROR: README-derived directory, category pages, project pages, or social cards are stale; run python3 scripts/export.py", file=sys.stderr)
            return 1
        print(f"OK: resources.json, {len(category_pages)} category pages, {len(pages)} project pages, {len(cards)} project cards, and {len(category_cards)} category cards match README.md")
        return 0
    PROJECTS_DIR.mkdir(exist_ok=True)
    for stale in set(PROJECTS_DIR.glob("*.html")) - set(pages):
        stale.unlink()
    for path, content in pages.items():
        path.write_text(content, encoding="utf-8")
    CATEGORIES_DIR.mkdir(exist_ok=True)
    for stale in set(CATEGORIES_DIR.glob("*.html")) - set(category_pages):
        stale.unlink()
    for path, content in category_pages.items():
        path.write_text(content, encoding="utf-8")
    CARDS_DIR.mkdir(exist_ok=True)
    for stale in set(CARDS_DIR.glob("*.png")) - set(cards):
        stale.unlink()
    for path, spec in cards.items():
        path.write_bytes(render_card(*spec))
    CATEGORY_CARDS_DIR.mkdir(exist_ok=True)
    for stale in set(CATEGORY_CARDS_DIR.glob("*.png")) - set(category_cards):
        stale.unlink()
    for path, spec in category_cards.items():
        path.write_bytes(render_category_card(*spec))
    OUTPUT.write_text(generated, encoding="utf-8")
    print(f"Exported {document['total_resources']} resources to resources.json, {len(category_pages)} category pages, {len(pages)} project pages, {len(cards)} project cards, and {len(category_cards)} category cards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
