#!/usr/bin/env python3
"""Fast, dependency-free structural checks for the curated list."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
COMMUNITY_START = "## Community projects"
COMMUNITY_END = "## Contributing"
MINIMUM_COMMUNITY_ENTRIES = 20


def github_slug(heading: str) -> str:
    heading = heading.strip().lower()
    heading = re.sub(r"[^\w\- ]", "", heading, flags=re.UNICODE)
    return re.sub(r"[\s-]+", "-", heading).strip("-")


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)


def main() -> int:
    text = README.read_text(encoding="utf-8")
    lines = text.splitlines()
    failures: list[str] = []

    required = {
        "# Awesome TypeSafe": "missing canonical title",
        "https://awesome.re/badge-flat2.svg": "missing Awesome badge",
        "**Independent community project.**": "missing independence disclaimer",
        "Last reviewed:": "missing review date",
        COMMUNITY_START: "missing community-projects section",
        "CONTRIBUTING.md": "missing contribution-guide link",
    }
    for needle, message in required.items():
        if needle not in text:
            fail(message, failures)

    for line_number, line in enumerate(lines, start=1):
        if line.rstrip() != line:
            fail(f"README.md:{line_number}: trailing whitespace", failures)

    headings = {
        github_slug(match.group(1))
        for line in lines
        if (match := re.match(r"^#{1,6}\s+(.+?)\s*$", line))
    }
    for anchor in re.findall(r"\]\(#([^)]+)\)", text):
        if anchor not in headings:
            fail(f"table-of-contents anchor has no heading: #{anchor}", failures)

    external_links = re.findall(r"\]\((https?://[^)]+)\)", text)
    seen: dict[str, int] = {}
    for url in external_links:
        if "utm_" in url or "?ref=" in url:
            fail(f"tracking parameter in URL: {url}", failures)
        seen[url] = seen.get(url, 0) + 1
    for url, count in seen.items():
        if count > 1:
            fail(f"duplicate URL ({count} occurrences): {url}", failures)

    try:
        community = text.split(COMMUNITY_START, 1)[1].split(COMMUNITY_END, 1)[0]
    except IndexError:
        community = ""

    community_entries = [
        line for line in community.splitlines() if line.startswith("- [")
    ]
    if len(community_entries) < MINIMUM_COMMUNITY_ENTRIES:
        fail(
            f"community list has {len(community_entries)} entries; "
            f"expected at least {MINIMUM_COMMUNITY_ENTRIES}",
            failures,
        )

    current_heading = ""
    entries_by_heading: dict[str, list[tuple[str, int]]] = {}
    in_community = False
    for line_number, line in enumerate(lines, start=1):
        if line == COMMUNITY_START:
            in_community = True
            continue
        if line == COMMUNITY_END:
            in_community = False
        if not in_community:
            continue
        if line.startswith("### "):
            current_heading = line.removeprefix("### ")
            entries_by_heading[current_heading] = []
        elif line.startswith("- ["):
            match = re.match(r"^- \[([^]]+)]\((https://[^)]+)\) — (.+)$", line)
            if not match:
                fail(
                    f"README.md:{line_number}: community entry does not match "
                    "'[Name](https://...) — Description.'",
                    failures,
                )
                continue
            name, _, description = match.groups()
            if not description.endswith("."):
                fail(
                    f"README.md:{line_number}: community description must end with a period",
                    failures,
                )
            entries_by_heading.setdefault(current_heading, []).append(
                (name.casefold(), line_number)
            )

    for heading, entries in entries_by_heading.items():
        names = [name for name, _ in entries]
        if names != sorted(names):
            ordered = ", ".join(name for name, _ in sorted(entries))
            fail(f"'{heading}' is not alphabetical; expected: {ordered}", failures)

    if failures:
        for message in failures:
            print(f"ERROR: {message}", file=sys.stderr)
        return 1

    print(
        f"OK: {len(external_links)} external links, "
        f"{len(community_entries)} community entries, and all structural checks passed."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
