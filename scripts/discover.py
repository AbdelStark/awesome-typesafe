#!/usr/bin/env python3
"""Produce a bounded, unvetted GitHub review queue for the curated README.

GitHub search finds candidates, not evidence of quality or inclusion. Review each
project's own source against CONTRIBUTING.md before editing README.md.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
SEARCH_URL = "https://docs.github.com/en/rest/search/search#search-repositories"
CONTRIBUTING_URL = (
    "https://github.com/AbdelStark/awesome-typesafe-jev/blob/main/CONTRIBUTING.md"
)
SEARCH_FIELDS = (
    "{total_count,incomplete_results,items:[.items[]|"
    "{full_name,html_url,description,pushed_at,stargazers_count,archived,fork}]}"
)


def github_repo(url: str) -> str | None:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname not in {"github.com", "www.github.com"}:
        return None
    parts = parsed.path.strip("/").split("/")
    if len(parts) < 2:
        return None
    return f"{parts[0]}/{parts[1].removesuffix('.git')}".casefold()


def listed_repositories(readme: str) -> set[str]:
    community = readme.split("## Community projects", 1)[1].split("## Contributing", 1)[0]
    urls = re.findall(r"^- \[[^]]+\]\((https://[^)]+)\)", community, flags=re.M)
    return {repo for url in urls if (repo := github_repo(url))}


def search(query: str, per_query: int) -> dict:
    result = subprocess.run(
        [
            "gh", "api", "-X", "GET", "search/repositories",
            "-f", f"q={query}", "-f", "sort=updated", "-f", "order=desc",
            "-f", f"per_page={per_query}", "-f", "page=1",
            "--jq", SEARCH_FIELDS,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode:
        raise RuntimeError(
            f"GitHub search failed (exit {result.returncode}); "
            "inspect gh authentication and rate limits"
        )
    return json.loads(result.stdout)


def clean(value: object) -> str:
    return html.escape(str(value or "").replace("\n", " ").replace("|", "\\|"))


def report(since: str, per_query: int, limit: int) -> str:
    listed = listed_repositories(README.read_text(encoding="utf-8"))
    searches = {
        "Jev topic": f"topic:jev pushed:>={since} fork:false archived:false",
        "Named Jev, starred": (
            f"jev in:name,description stars:>=2 pushed:>={since} "
            "fork:false archived:false"
        ),
        "New named Jev": f"jev in:name,description created:>={since} fork:false archived:false",
        "TypeSafe README": (
            f"typesafe.ai in:readme stars:>=1 pushed:>={since} "
            "fork:false archived:false"
        ),
    }
    candidates: dict[str, dict] = {}
    coverage = []
    for label, query in searches.items():
        result = search(query, per_query)
        items = result["items"]
        total = result["total_count"]
        coverage.append((label, query, len(items), total, result["incomplete_results"]))
        for item in items:
            slug = item["full_name"].casefold()
            repository_name = slug.split("/", 1)[1]
            if (
                slug in listed or slug == "abdelstark/awesome-typesafe-jev"
                or slug.startswith("typesafe-ai/") or item["archived"] or item["fork"]
                or repository_name.startswith(("awesome-jev", "awesome-typesafe"))
            ):
                continue
            if slug not in candidates:
                candidates[slug] = {**item, "searches": set()}
            candidates[slug]["searches"].add(label)

    found = list(candidates.values())
    by_stars = sorted(
        found, key=lambda item: (-item["stargazers_count"], item["full_name"].casefold())
    )
    by_recent = sorted(
        found,
        key=lambda item: (item["pushed_at"] or "", item["full_name"].casefold()),
        reverse=True,
    )
    chosen: dict[str, dict] = {}
    for item in by_stars[: limit // 2] + by_recent[: limit - limit // 2]:
        chosen[item["full_name"].casefold()] = item
    display = sorted(
        chosen.values(),
        key=lambda item: (
            -len(item["searches"]),
            -item["stargazers_count"],
            item["full_name"].casefold(),
        ),
    )

    lines = [
        "# Jev ecosystem discovery queue",
        "",
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} "
        f"· pushed/created cutoff: {since}.",
        "",
        "**Unvetted search hits.** Inclusion requires a source review against "
        f"[CONTRIBUTING.md]({CONTRIBUTING_URL}). Stars and search overlap are "
        "triage signals, not quality or endorsement. The README remains the "
        "sole source for published listings.",
        "",
        f"GitHub [repository search]({SEARCH_URL}) returns at most {per_query} "
        "recent results per query here. Counts above that limit mean this "
        "report is a sample, not an exhaustive inventory. Search may also "
        "flag incomplete results.",
        "",
        "| Search | Returned | Matching | Incomplete |",
        "| :--- | ---: | ---: | :---: |",
    ]
    for label, query, returned, total, incomplete in coverage:
        url = f"https://github.com/search?q={quote(query, safe='')}&type=repositories"
        lines.append(
            f"| [{clean(label)}]({url}) | {returned} | {total} | "
            f"{'yes' if incomplete else 'no'} |"
        )
    lines += [
        "",
        f"{len(found)} distinct unlisted repositories in sampled results; "
        f"showing {len(display)} (half selected by stars, half by last push, "
        "then deduplicated).",
        "",
        "| Repository | Stars | Last push (UTC) | Search hits | Description from GitHub |",
        "| :--- | ---: | :--- | :--- | :--- |",
    ]
    for item in display:
        lines.append(
            f"| [{clean(item['full_name'])}]({item['html_url']}) | {item['stargazers_count']} | "
            f"{(item['pushed_at'] or '')[:10]} | {clean(', '.join(sorted(item['searches'])))} | "
            f"{clean(item['description'])} |"
        )
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    default_since = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()
    parser.add_argument("--since", default=default_since)
    parser.add_argument("--per-query", type=int, default=100)
    parser.add_argument("--limit", type=int, default=80)
    parser.add_argument("--output", type=Path, help="write Markdown here instead of stdout")
    args = parser.parse_args()
    try:
        datetime.strptime(args.since, "%Y-%m-%d")
        if not 1 <= args.per_query <= 100 or not 2 <= args.limit <= 400:
            parser.error("--per-query must be 1–100 and --limit must be 2–400")
        markdown = report(args.since, args.per_query, args.limit)
        if args.output:
            args.output.write_text(markdown, encoding="utf-8")
        else:
            sys.stdout.write(markdown)
    except (KeyError, ValueError, RuntimeError, IndexError) as exc:
        print(f"Discovery failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
