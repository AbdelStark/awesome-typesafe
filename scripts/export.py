#!/usr/bin/env python3
"""Export the community directory from its canonical README entries."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

from check import github_slug


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
OUTPUT = ROOT / "resources.json"
PROJECTS_DIR = ROOT / "projects"
ENTRY = re.compile(r"^- \[([^]]+)]\((https://[^)]+)\) — (.+)$")


def project_slug(url: str) -> str:
    parsed = urlsplit(url)
    host = (parsed.hostname or "").lower()
    path = parsed.path.strip("/").replace("/", "-")
    raw = f"gh-{path}" if host in {"github.com", "www.github.com"} else f"site-{host.removeprefix('www.').replace('.', '-')}-{path}"
    return re.sub(r"[^a-z0-9]+", "-", raw.lower()).strip("-")


def plain_description(markdown: str) -> str:
    text = re.sub(r"\[([^]]+)]\(https?://[^)]+\)", r"\1", markdown)
    return re.sub(r"[`*_]", "", text)


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
            categories.append({"id": github_slug(name), "name": name, "resources": []})
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
    if not categories or any(not category["resources"] for category in categories):
        raise ValueError("Every community category must have resources")
    total = sum(len(category["resources"]) for category in categories)
    return {
        "schema_version": 1,
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
                resources[neighbor]
                for neighbor in (index - 1, index + 1, index + 2)
                if 0 <= neighbor < len(resources)
            ]
            metadata = {
                "layout": "resource",
                "title": f"{resource['name']} | Awesome Jev",
                "description": plain_description(resource["description_markdown"]),
                "permalink": resource["permalink"],
                "resource_name": resource["name"],
                "resource_url": resource["url"],
                "description_markdown": resource["description_markdown"],
                "category_name": category["name"],
                "category_id": category["id"],
            }
            lines = ["---"] + [
                f"{key}: {json.dumps(value, ensure_ascii=False)}"
                for key, value in metadata.items()
            ]
            lines.append("related:")
            for other in related:
                lines.append(f"  - name: {json.dumps(other['name'], ensure_ascii=False)}")
                lines.append(f"    permalink: {json.dumps(other['permalink'], ensure_ascii=False)}")
            lines.extend(["---", ""])
            slug = resource["permalink"].strip("/").split("/")[-1]
            path = PROJECTS_DIR / f"{slug}.html"
            if path in pages:
                raise ValueError(f"Project permalink collision: {resource['permalink']}")
            pages[path] = "\n".join(lines)
    return pages


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if resources.json is stale")
    args = parser.parse_args()
    try:
        document = build_document()
        generated = json.dumps(document, ensure_ascii=False, indent=2) + "\n"
        pages = build_pages(document)
    except (IndexError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    if args.check:
        actual_pages = set(PROJECTS_DIR.glob("*.html"))
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != generated or actual_pages != set(pages) or any(
            path.read_text(encoding="utf-8") != content for path, content in pages.items()
        ):
            print("ERROR: README-derived directory or project pages are stale; run python3 scripts/export.py", file=sys.stderr)
            return 1
        print(f"OK: resources.json and {len(pages)} project pages match README.md")
        return 0
    PROJECTS_DIR.mkdir(exist_ok=True)
    for stale in set(PROJECTS_DIR.glob("*.html")) - set(pages):
        stale.unlink()
    for path, content in pages.items():
        path.write_text(content, encoding="utf-8")
    OUTPUT.write_text(generated, encoding="utf-8")
    print(f"Exported {document['total_resources']} resources to resources.json and {len(pages)} project pages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
