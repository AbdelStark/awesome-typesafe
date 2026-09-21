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


def search(query: str, per_query: int, sort: str, page: int) -> dict:
    result = subprocess.run(
        [
            "gh", "api", "-X", "GET", "search/repositories",
            "-f", f"q={query}", "-f", f"sort={sort}", "-f", "order=desc",
            "-f", f"per_page={per_query}", "-f", f"page={page}",
            "--jq", SEARCH_FIELDS,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode:
        raise RuntimeError(
            f"GitHub search failed for {sort} page {page} (exit {result.returncode}); "
            "inspect gh authentication and rate limits"
        )
    return json.loads(result.stdout)


def search_pages(query: str, per_query: int, pages: int, sort: str) -> tuple[list[dict], int, bool]:
    items: list[dict] = []
    total = 0
    incomplete = False
    for page in range(1, pages + 1):
        result = search(query, per_query, sort, page)
        batch = result["items"]
        total = result["total_count"]
        incomplete |= result["incomplete_results"]
        items.extend(batch)
        if len(batch) < per_query or page * per_query >= total:
            break
    return items, total, incomplete


def clean(value: object) -> str:
    return html.escape(str(value or "").replace("\n", " ").replace("|", "\\|"))


def report(since: str, per_query: int, pages: int, limit: int) -> str:
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
        for sort in ("updated", "stars"):
            items, total, incomplete = search_pages(query, per_query, pages, sort)
            coverage.append((label, query, sort, len(items), total, incomplete))
            for item in items:
                slug = item["full_name"].casefold()
                repository_name = slug.split("/", 1)[1]
                if (
                    slug in listed or slug == "abdelstark/awesome-typesafe-jev"
                    or slug.startswith("typesafe-ai/") or item["archived"] or item["fork"]
                    or repository_name.startswith(("awesome-jev", "awesome-typesafe"))
                ):
                    continue
                # A README mention alone can come from a dependency or link in
                # an unrelated repository. Use it only as corroboration.
                if label == "TypeSafe README" and slug not in candidates:
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
        "The TypeSafe README query only adds a signal to repositories already "
        "found by a Jev topic or name/description search; a README mention "
        "alone does not enter the queue.",
        "",
        f"GitHub [repository search]({SEARCH_URL}) samples up to {pages} pages "
        f"of {per_query} results in both update and star order per query. "
        "The orders overlap, results can change between requests, and counts "
        "above the sample remain unreviewed. This is not an exhaustive inventory; "
        "GitHub may also flag incomplete results.",
        "",
        "| Search | Order | Sampled | Matching | Incomplete |",
        "| :--- | :--- | ---: | ---: | :---: |",
    ]
    for label, query, sort, sampled, total, incomplete in coverage:
        url = f"https://github.com/search?q={quote(query, safe='')}&type=repositories&s={sort}&o=desc"
        lines.append(
            f"| [{clean(label)}]({url}) | {sort} | {sampled} | {total} | "
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
    parser.add_argument("--pages", type=int, default=2, help="pages per query and sort (1–3)")
    parser.add_argument("--limit", type=int, default=80)
    parser.add_argument("--output", type=Path, help="write Markdown here instead of stdout")
    args = parser.parse_args()
    try:
        datetime.strptime(args.since, "%Y-%m-%d")
        if not 1 <= args.per_query <= 100 or not 1 <= args.pages <= 3 or not 2 <= args.limit <= 400:
            parser.error("--per-query must be 1–100, --pages 1–3, and --limit 2–400")
        markdown = report(args.since, args.per_query, args.pages, args.limit)
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
