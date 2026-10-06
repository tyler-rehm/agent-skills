# Vibe check

`checks/vibe/check.mjs` scans tracked source for mistakes that show up in AI-written projects. The catalog is 100 items in `checks/vibe/rules.mjs`.

## What fails

`error` findings exit 1. `warning` findings are printed and do not fail. `review` items are titles only. A regex cannot judge them, so they stay on the list for a person.

```sh
node checks/vibe/check.mjs --root .
node checks/vibe/check.mjs --root . --fail-on warning
```

In GitHub Actions the summary is the same report. Code Home calls `vibe-check.yml@v1` on push and pull request.

## What it skips

Tests, lockfiles, `node_modules`, `dist`, and this repo's own rule catalog. Bad strings inside a test are usually the case the test is rejecting.

## Code Home

Run on 2026-10-06 against `tyler-rehm/browser_home` at `44baa68`. Local result: no errors, one warning (`src/app.jsx` is 923 lines). The GitHub job [Vibe check](https://github.com/tyler-rehm/browser_home/actions/runs/37508787680) succeeded after the Node 22 regex fix.
