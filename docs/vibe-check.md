# Vibe check

`checks/vibe/check.mjs` scans tracked source for mistakes that show up in AI-written projects. The catalog is the 56 signed checks in `checks/vibe/rules.mjs`. Questions a scanner cannot answer are not in this repo.

## Report

Every run executes all 56 checks. It does not stop at the first hit, and it does not change your code. A hit is a suggestion. A row marked "Not applicable" means that repository has no files of the language or feature that check understands. The report never prints a matched secret, a dependency spec, a raw `uses:` value, or a matched expression.

`@v1.3.1` is this catalog. Callers that pin `@v1.2` still run the older checker. Tag `v1.3` points at the same checks, and its workflow file does not run.

```sh
node checks/vibe/check.mjs --root /path/to/project --report vibe-report.md
```

The markdown file starts with a summary table, then one row per check, then the suggestion details. `vibe-report.md` is gitignored.

Code Home runs this on every push to `main`, when a pull request is opened or updated, and from the Actions tab. The job uploads `vibe-report.md` as the `vibe-report` artifact and does not comment on the pull request. The public log only shows the three counts. Download the artifact from the run for the table and the file locations.

On a public repository, anyone who can see Actions can download that artifact. It is not posted on the pull request. A later job in the caller workflow can mail the file. This reusable workflow does not receive that mail secret.

## What it skips

Tests, lockfiles, `node_modules`, `dist`, and this repo's own rule catalog. Bad strings inside a test are usually the case the test is rejecting.

## Code Home

Run on 2026-10-06 against `tyler-rehm/browser_home` at `44baa68`. Local result: no errors, one warning (`src/app.jsx` is 923 lines). The GitHub job [Vibe check](https://github.com/tyler-rehm/browser_home/actions/runs/37508787680) succeeded after the Node 22 regex fix.
