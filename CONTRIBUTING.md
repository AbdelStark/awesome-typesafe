# Contributing

Thank you for helping make Awesome Jev more useful.

## Start with one small contribution

| If you noticed… | Do this | What to include |
| :--- | :--- | :--- |
| A missing public project you have used or inspected | Add one README entry using the [listing builder](https://abdelstark.github.io/awesome-typesafe-jev/#build-a-listing), or [suggest it](https://github.com/AbdelStark/awesome-typesafe-jev/issues/new?template=add-resource.yml) | Canonical URL, license for code, what data leaves the machine, and one material limitation |
| A broken link or inaccurate existing description | [Report it](https://github.com/AbdelStark/awesome-typesafe-jev/issues/new?template=report-stale.yml) or fix that one entry in a pull request | The current source showing the correction |
| A scoped maintenance task | Choose a [good first issue](https://github.com/AbdelStark/awesome-typesafe-jev/labels/good%20first%20issue) | A focused change and the source used to verify it |

For a first resource pull request, changing only `README.md` is sufficient. A maintainer generates the site artifacts before merging. You do not need a TypeSafe API key to contribute.

This is a curated list, not a directory of every repository that mentions Jev. A submission should help someone learn the model shape, build a real integration, reproduce an experiment, or understand a limitation.

## Before you submit

A resource should be:

- Publicly accessible without a private invitation, except for the clearly labeled official Discord channel.
- Directly related to TypeSafe, System One models, Jev, or a serious independent reproduction of the same interface pattern.
- Usable or inspectable today, with a README, demo, article, dataset, or other durable public entry point.
- Described accurately and without promotional superlatives.
- Licensed when it is source code.
- Safe about credentials and explicit about what data leaves the user's machine.

For evaluations and benchmarks, include the method, model version, task data, raw results or sufficient aggregates, and material limitations. A screenshot of a winning number is not enough.

Very early work is welcome when it teaches something concrete, but please label it as experimental. Empty repositories, generic wrappers with no documentation, copied launch summaries, referral links, and projects whose only evidence is a private claim will not be added.

## Add an entry

You can [edit the README on GitHub](https://github.com/AbdelStark/awesome-typesafe-jev/edit/main/README.md) and open a pull request. If you cannot send a pull request, [suggest a resource](https://github.com/AbdelStark/awesome-typesafe-jev/issues/new?template=add-resource.yml) instead. To correct an existing entry, use a pull request or [report a listing correction](https://github.com/AbdelStark/awesome-typesafe-jev/issues/new?template=report-stale.yml).

The [live listing builder](https://abdelstark.github.io/awesome-typesafe-jev/#build-a-listing) helps format the entry and find its alphabetical position. It keeps your draft in your browser; you still need to edit the README and open a pull request.

1. Choose exactly one section in `README.md`.
2. Add one bullet in alphabetical order by display name.
3. Use the canonical public URL, without tracking parameters.
4. Write one sentence in this form:

   ```markdown
   - [Project name](https://example.com) — What it does, what is distinctive, and any limitation a reader needs to know.
   ```

5. Open a pull request with the `README.md` edit. You do not need to install Python or commit generated files for the initial review. CI verifies that the directory, pages, and cards can be generated from your README change; a maintainer adds those artifacts before merging. Category introductions also live in the README. Do not edit generated files by hand.

   If you want to preview and check the generated output locally, run:

   ```bash
   python3 -m pip install -r scripts/requirements.txt
   python3 scripts/export.py
   python3 scripts/export.py --check
   python3 scripts/check.py
   ```

   You may include the generated files in your pull request. Use a virtual environment if your Python installation does not allow global package installs.

6. In the pull request, explain why the resource belongs and disclose whether you maintain or are affiliated with it.

Before merging a README-only pull request, maintainers run `python3 scripts/export.py`, commit the changed `resources.json`, project and category pages, and social cards, then run `python3 scripts/export.py --check` and `python3 scripts/check.py`. Pushes to `main` require those committed artifacts to match the README exactly.

Please do not add star counts, follower counts, or speed claims to the description. Those values drift quickly. Link to the project's evidence instead.

## Update or remove an entry

Fix moved links and stale descriptions in place. Propose removal when a resource is unavailable, abandoned in a way that makes it unusable, misleading, malicious, or no longer directly relevant.

Removal is maintenance, not a judgment on the author.

## Maintainer discovery

The [Ecosystem discovery workflow](https://github.com/AbdelStark/awesome-typesafe-jev/actions/workflows/discovery.yml) writes a daily review queue to its run summary. Run `python3 scripts/discover.py` locally for the same report (the GitHub CLI must be authenticated), or pass `--since YYYY-MM-DD` to widen the search window. The script samples up to two pages in both recent-update and star order for each bounded GitHub repository search, removes GitHub URLs already listed in the community section, and shows both recently pushed and starred results. Use `--pages 1` for a smaller sweep or `--pages 3` for a wider one. A search hit is not a recommendation: inspect the project's own code, license, documentation, and evidence against the criteria above before changing the README. GitHub search can omit results, and the report shows exactly how much of each query it sampled.

## Share your listing

If your project is listed, you can link back with this optional badge:

```markdown
[![Listed in Awesome Jev](https://abdelstark.github.io/awesome-typesafe-jev/assets/listed-badge.svg)](https://abdelstark.github.io/awesome-typesafe-jev/#community-projects)
```

For a badge that links to your specific entry, find your card in the [live directory](https://abdelstark.github.io/awesome-typesafe-jev/) or open its project page and use **Copy listing badge**. The copied Markdown is ready for your project's README. “Listed” means the resource met this directory's inclusion rules; it does not imply an endorsement or security review.

Each project page also has **Download share card**. Its 1200×630 PNG is generated from the README-derived name, category, and description. That same image appears when the project-page URL is shared on services that support Open Graph previews.

## Pull request scope

Keep each pull request focused. One resource or one coherent maintenance pass is ideal. Do not reformat unrelated sections.

By participating, you agree to keep discussion technical, specific, and respectful. Critique claims and artifacts, not people.

## Credit contributors

We use the [All Contributors CLI](https://github.com/all-contributors/allcontributors.org/blob/main/src/content/docs/en/cli/usage.mdx) to credit work on the list, including documentation and code. The `.all-contributorsrc` file records the contribution types, and the CLI generates the badge and portrait table in `README.md`. Since the Pages site renders that same README, credits appear in both places.

To add a contributor after their contribution has landed, run:

```bash
npx --yes all-contributors-cli@6.26.1 add USERNAME doc
npx --yes all-contributors-cli@6.26.1 generate
npx --yes all-contributors-cli@6.26.1 check
python3 scripts/check.py
```

Use the [contribution types](https://github.com/all-contributors/allcontributors.org/blob/main/src/content/docs/en/reference/emoji-key.mdx) that describe the actual work. Commit both `.all-contributorsrc` and `README.md`. Do not credit a project author solely because their project is listed; credit their contribution to this repository.
