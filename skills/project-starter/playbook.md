# Playbook

Public fallback. The private defaults live outside this repo. `playbook-source.json` points at that directory. Read this file only when that directory is missing.

How Code Home (`tyler-rehm/browser_home`) was built, and which choices travel.

## What it is

A local Safari homepage. One static page, no account, no analytics, no backend. Links, notes, appearance, and groups stay in Safari `localStorage` for one origin, `http://home.localhost:4173`.

## Stack that shipped

- React 19 and Vite 8. Tailwind CSS v4. Headless UI for dialogs. Local button and dialog components.
- Node production server in `src/server.js`. It serves `dist/` on loopback port 4173. Tests use that server, not the Vite dev server. Vite on `127.0.0.1` is a different storage origin.
- Exact versions in `package.json`. Node 22, 24, and 26 in CI. Engines `>=22.13`. Node 23 and 25 are out.
- Fonts from Fontsource, files committed by the build: Manrope, DM Mono, and Inter. Not a Google Fonts request.
- Icons are inline SVGs in this project.
- Drag and drop uses `@dnd-kit` (pointer only). Keyboard reorder stays on the grip.
- MIT license. Copyright 2026 Tyler Rehm. `NOTICE` covers fonts. Tailwind Plus and Catalyst source is not in the repo.
- Public GitHub repo `tyler-rehm/browser_home`. Sponsors: `.github/FUNDING.yml` and a footer link, added only after the Sponsors page returned 200.

## How a change landed

1. OpenSpec change under `openspec/changes/`, then archive with the CLI when the work is done.
2. Smallest change that matches the existing code. Focused unit test and, for UI, a Playwright test.
3. `npm run test:all` before handoff: format, lint, unit, production build, Chromium and WebKit, publication audit.
4. `npm run build`, then `node scripts/home-service.js update`, then reload Safari. The login helper is `local.browser-home`.
5. Changelog line under Unreleased. Commit when asked. Push when the change should be on GitHub.
6. Tag only after `test (22)`, `test (24)`, `test (26)`, and CodeQL `analyze` are green on that SHA.
7. Do not change Safari settings from the agent. Do not dump private tab titles.

## Rules that were specific to this app

- Storage keys: `code-home-links`, `code-home-notes`, `code-home-preferences`, `code-home-groups`.
- Invalid stored data stays until the user edits, imports, or confirms a reset.
- Do not show a saved state after a failed write.
- A link `groupId` that matches no saved group is shown with no group and is not rewritten on load.
- Imported JSON and typed URLs go through `src/records.js`.
- Do not commit `home-preferences.json`, backups, `dist/`, or test output.

## Choices to ask about next time

| Choice | Code Home | Ask, because |
| --- | --- | --- |
| Language | JavaScript | TypeScript is reasonable when a second person will read it |
| UI | React + Vite + Tailwind v4 | Skip the UI when there is no page |
| Components | Headless UI, no Plus source | Plus is a local reference, not a dependency |
| Fonts | Manrope, DM Mono, Inter | Firm work uses IBM Plex |
| Icons | Inline SVG | Firm work uses Heroicons |
| Data | Browser storage | A database changes backup, auth, and tenancy |
| Host | This Mac, loopback | A public host needs secrets, TLS, and a deploy story |
| Specs | OpenSpec | Small one-off scripts do not need it |

## Review habits

- Plan the behavior, then edit.
- Verify a UI change in a browser, including the empty and error states.
- A green local run is not a Safari or reboot test. Those stay written in `docs/release.md`.
- Direct pushes to protected `main` record an admin bypass when admin enforcement is off. Prefer a pull request when someone else will read it.
