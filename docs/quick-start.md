# Quick start

This repo is files, not a package. Pick one of the two ways below.

## Use the skill in Cursor

From a clone of this repo:

```sh
mkdir -p "$HOME/.cursor/skills"
ln -snf "$PWD/skills/project-starter" "$HOME/.cursor/skills/project-starter"
```

Cursor then sees `project-starter` in every project. Ask it to start a project. It will ask for the product, runtime, UI, data, hosting, and license before it writes files. It reads `playbook-source.json` and uses that directory when it is present. `skills/project-starter/playbook.md` is the fallback.

## Run the checks on a repo you already have

```sh
node checks/vibe/check.mjs --root /path/to/project
```

The run prints one counts line. A suggestion does not fail the command. Add this to GitHub Actions:

```yaml
permissions:
  contents: read
jobs:
  vibe:
    uses: tyler-rehm/agent-skills/.github/workflows/vibe-check.yml@v1.3.1
```

The job uploads `vibe-report.md`. It does not open a pull request or comment. Suggestions do not fail the build.

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
