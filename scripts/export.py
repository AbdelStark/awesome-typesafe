#!/usr/bin/env python3
"""Export the community directory from its canonical README entries."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from check import github_slug


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
OUTPUT = ROOT / "resources.json"
ENTRY = re.compile(r"^- \[([^]]+)]\((https://[^)]+)\) — (.+)$")


def build() -> str:
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
            categories[-1]["resources"].append(
                {"name": name, "url": url, "description_markdown": description}
            )
    if not categories or any(not category["resources"] for category in categories):
        raise ValueError("Every community category must have resources")
    total = sum(len(category["resources"]) for category in categories)
    document = {
        "schema_version": 1,
        "source": "https://github.com/AbdelStark/awesome-typesafe-jev/blob/main/README.md",
        "last_updated": updated.group(1),
        "total_resources": total,
        "notice": "Community entries are independent unless their source says otherwise. Inclusion is not endorsement.",
        "categories": categories,
    }
    return json.dumps(document, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if resources.json is stale")
    args = parser.parse_args()
    try:
        generated = build()
    except (IndexError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != generated:
            print("ERROR: resources.json is stale; run python3 scripts/export.py", file=sys.stderr)
            return 1
        print("OK: resources.json matches README.md")
        return 0
    OUTPUT.write_text(generated, encoding="utf-8")
    print(f"Exported {json.loads(generated)['total_resources']} resources to resources.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
