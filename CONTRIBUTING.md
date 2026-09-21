# Contributing

Thank you for helping make Awesome TypeSafe more useful.

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

1. Choose exactly one section in `README.md`.
2. Add one bullet in alphabetical order by display name.
3. Use the canonical public URL, without tracking parameters.
4. Write one sentence in this form:

   ```markdown
   - [Project name](https://example.com) — What it does, what is distinctive, and any limitation a reader needs to know.
   ```

5. Run the local checks:

   ```bash
   python3 scripts/check.py
   ```

6. In the pull request, explain why the resource belongs and disclose whether you maintain or are affiliated with it.

Please do not add star counts, follower counts, or speed claims to the description. Those values drift quickly. Link to the project's evidence instead.

## Update or remove an entry

Fix moved links and stale descriptions in place. Propose removal when a resource is unavailable, abandoned in a way that makes it unusable, misleading, malicious, or no longer directly relevant.

Removal is maintenance, not a judgment on the author.

## Pull request scope

Keep each pull request focused. One resource or one coherent maintenance pass is ideal. Do not reformat unrelated sections.

By participating, you agree to keep discussion technical, specific, and respectful. Critique claims and artifacts, not people.

## Credit contributors

We use the [All Contributors CLI](https://allcontributors.org/en/cli/usage/) to credit work on the list, including documentation and code. The `.all-contributorsrc` file records the contribution types, and the CLI generates the badge and portrait table in `README.md`. Since the Pages site renders that same README, credits appear in both places.

To add a contributor after their contribution has landed, run:

```bash
npx --yes all-contributors-cli@6.26.1 add USERNAME doc
npx --yes all-contributors-cli@6.26.1 generate
npx --yes all-contributors-cli@6.26.1 check
python3 scripts/check.py
```

Use the [contribution types](https://allcontributors.org/en/reference/emoji-key/) that describe the actual work. Commit both `.all-contributorsrc` and `README.md`. Do not credit a project author solely because their project is listed; credit their contribution to this repository.
