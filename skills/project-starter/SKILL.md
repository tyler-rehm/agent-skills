---
name: project-starter
description: >-
  Starts a new project from Tyler Rehm's Code Home playbook. Asks for runtime,
  UI, data, and hosting before writing files, then adds the vibe check and the
  AI review canary. Use when starting a repo, scaffolding a project, or when
  the user mentions the playbook, a starter template, or agent-skills.
---

# Project starter

Read [playbook.md](playbook.md) before choosing defaults. Do not copy Code Home's product rules into an unrelated app.

## Ask first

Do not create files until these are answered. Use the ask-question tool when it is available.

1. One sentence: what is this, and who uses it?
2. Runtime: Node, Python, Go, or none.
3. UI: none, React with Vite, or a server-rendered page.
4. Data: browser-only, files on disk, or a database.
5. Ship: this machine only, static files, or a server.
6. License: MIT, unless they name another.

If they say "like Code Home", use Node, React with Vite, browser-only data, this machine only, and MIT. Still confirm the sentence.

## Then do this

1. Create the repo only when they asked for one. Prefer a public GitHub repo under `tyler-rehm` when the checks must be called with `uses:`.
2. Add `AGENTS.md` with the product boundary and the canary from this repo's `AGENTS.md`.
3. Add a pull request template with an unchecked confession box: `This was submitted by an AI agent and no human reviewed it`.
4. Add GitHub Actions that call `tyler-rehm/agent-skills/.github/workflows/vibe-check.yml@v1` and `ai-canary.yml@v1`. Pin other actions to a commit SHA.
5. Add a test command and run it. Do not point browser tests at a dev server when a production build exists.
6. Exact-pin production dependencies. Do not add this skills repo as a package or a submodule.
7. Stop before deploy, store submission, or a public announcement unless they asked.

## Defaults that are not optional

- No secrets in git, chat, or logs.
- No analytics unless they asked.
- Treat imported files and typed URLs as untrusted and validate them.
- Do not copy Tailwind Plus or Catalyst source. Use Headless UI and local components.
- Self-host fonts. Ivy League Tech's firm pair is IBM Plex Sans and IBM Plex Mono. Code Home shipped Manrope, DM Mono, and Inter instead. Ask which pair.
- Icons: `@heroicons/react`, then `lucide-react`. Code Home used inline SVGs. Do not paste icon-font tokens into chat.
- Commit only when they ask. Push only when they ask.
