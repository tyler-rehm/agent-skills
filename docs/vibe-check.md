# Vibe check

`checks/vibe/check.mjs` scans tracked source for mistakes that show up in AI-written projects. The catalog is 100 items in `checks/vibe/rules.mjs`.

## What fails

`error` findings exit 1. `warning` findings are printed and do not fail. `review` items are titles only. A regex cannot judge them, so they stay on the list for a person.

```sh
node checks/vibe/check.mjs --root .
node checks/vibe/check.mjs --root . --fail-on warning
```

Code Home runs this on every push to `main`, on pull requests, and from the Actions tab (`workflow_dispatch`).

A finding on a changed line becomes a review comment on that line. A finding that is not on a changed line becomes one general pull request comment. A `debugger` statement is the one edit the job will make itself: on a push to `main` it opens a pull request with that line removed. Other findings stay comments, because guessing a rewrite would be the slop this check is meant to catch.

## What it skips

Tests, lockfiles, `node_modules`, `dist`, and this repo's own rule catalog. Bad strings inside a test are usually the case the test is rejecting.

## Code Home

Run on 2026-10-06 against `tyler-rehm/browser_home` at `44baa68`. Local result: no errors, one warning (`src/app.jsx` is 923 lines). The GitHub job [Vibe check](https://github.com/tyler-rehm/browser_home/actions/runs/37508787680) succeeded after the Node 22 regex fix.
