# Agent skills

Personal skills and checks for Tyler Rehm's projects. They are plain files. Nothing here is an npm package.

Start here: [Quick start](docs/quick-start.md). Then [vibe check](docs/vibe-check.md) and [AI canary](docs/ai-canary.md).

## Use them across projects

Copy or symlink a skill into `~/.cursor/skills/`:

```sh
ln -snf "$PWD/skills/project-starter" "$HOME/.cursor/skills/project-starter"
```

Cursor reads that folder from every project. App repos do not depend on this one.

Checks are one Node script with no dependencies:

```sh
node checks/vibe/check.mjs --root /path/to/project
```

Or call the reusable workflows and pin the tag:

```yaml
jobs:
  vibe:
    uses: tyler-rehm/agent-skills/.github/workflows/vibe-check.yml@v1
  canary:
    uses: tyler-rehm/agent-skills/.github/workflows/ai-canary.yml@v1
```

That pin is the only runtime link. Do not add this repo as a package dependency or a git submodule.

## What is here

- `skills/project-starter` — ask which stack to use, then start a repo from the Code Home playbook.
- `checks/vibe` — 100 vibe-coding mistakes. Errors fail the job. Warnings are printed. The rest is a review list, because a regex cannot judge them.
- `canary` — the AI review canary. An agent that follows `AGENTS.md` marks the change. A human removes the mark after reading the diff.

`node --test` runs the unit tests.
