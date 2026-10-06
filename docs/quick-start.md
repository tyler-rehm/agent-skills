# Quick start

This repo is files, not a package. Pick one of the two ways below.

## Use the skill in Cursor

From a clone of this repo:

```sh
mkdir -p "$HOME/.cursor/skills"
ln -snf "$PWD/skills/project-starter" "$HOME/.cursor/skills/project-starter"
```

Cursor then sees `project-starter` in every project. Ask it to start a project. It will ask for the product, runtime, UI, data, hosting, and license before it writes files. The Code Home record is `skills/project-starter/playbook.md`.

## Run the checks on a repo you already have

```sh
node checks/vibe/check.mjs --root /path/to/project
```

Exit 0 means no error-level findings. Warnings are printed and do not fail. Add this to GitHub Actions:

```yaml
permissions:
  contents: write
  pull-requests: write
jobs:
  vibe:
    uses: tyler-rehm/agent-skills/.github/workflows/vibe-check.yml@v1.1
```

`contents: write` is what lets a push to `main` open a fix pull request. The job still fails when an error-level finding remains.

The AI canary is separate. Copy the hard rule from this repo's `AGENTS.md` into the other project's `AGENTS.md`, add the confession box to its pull request template, then:

```yaml
jobs:
  canary:
    permissions:
      contents: read
      pull-requests: write
      issues: write
    uses: tyler-rehm/agent-skills/.github/workflows/ai-canary.yml@v1
```

Pin `@v1`. Do not add this repo as an npm dependency or a git submodule.

Details: [vibe check](vibe-check.md), [AI canary](ai-canary.md).
