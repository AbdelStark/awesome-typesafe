"""Offline checks for the bounded GitHub discovery sweep."""

import unittest
from unittest.mock import patch

from scripts import discover


def repo(name: str, stars: int) -> dict:
    return {
        "full_name": name,
        "html_url": f"https://github.com/{name}",
        "description": "Uses Jev for a typed decision",
        "pushed_at": "2026-09-21T12:00:00Z",
        "stargazers_count": stars,
        "archived": False,
        "fork": False,
    }


class DiscoveryTests(unittest.TestCase):
    def test_pages_stop_when_results_are_exhausted(self) -> None:
        def response(query: str, per_query: int, sort: str, page: int) -> dict:
            self.assertEqual((query, per_query, sort), ("jev", 2, "stars"))
            return {
                "items": [repo("a/one", 2), repo("b/two", 1)] if page == 1 else [repo("c/three", 0)],
                "total_count": 3,
                "incomplete_results": page == 2,
            }

        with patch.object(discover, "search", side_effect=response) as search:
            items, total, incomplete = discover.search_pages("jev", 2, 3, "stars")
        self.assertEqual([item["full_name"] for item in items], ["a/one", "b/two", "c/three"])
        self.assertEqual((total, incomplete), (3, True))
        self.assertEqual(search.call_count, 2)

    def test_star_order_adds_candidates_but_readme_only_hits_do_not(self) -> None:
        def pages(query: str, per_query: int, count: int, sort: str) -> tuple[list[dict], int, bool]:
            self.assertEqual((per_query, count), (2, 2))
            if query.startswith("topic:jev"):
                return ([repo("a/recent", 1)] if sort == "updated" else [repo("b/popular", 90)]), 80, False
            if query.startswith("typesafe.ai in:readme"):
                return [repo("a/recent", 1), repo("c/readme-only", 100)], 200, False
            return [], 0, False

        with patch.object(discover, "listed_repositories", return_value=set()), patch.object(
            discover, "search_pages", side_effect=pages
        ):
            output = discover.report("2026-09-19", 2, 2, 4)
        self.assertIn("https://github.com/a/recent", output)
        self.assertIn("https://github.com/b/popular", output)
        self.assertNotIn("https://github.com/c/readme-only", output)
        self.assertIn("2 distinct unlisted repositories", output)
        self.assertIn("| stars |", output)


if __name__ == "__main__":
    unittest.main()
