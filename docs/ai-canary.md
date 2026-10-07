# AI canary

The canary does not ban AI. It makes an unreviewed submission visible.

An agent that follows `AGENTS.md` must put these two lines at the top of `README.md` and must not remove them:

```markdown
> [!IMPORTANT]
> Remove this line to confirm a human reviewed this change before submitting.
```

A person deletes those lines after reading the diff. The same two lines at the start of an issue body are the issue form of the mark.

The pull request template has one box that must stay unchecked unless it is true:

```markdown
- [ ] This was submitted by an AI agent and no human reviewed it
```

Checking it, or leaving the README mark in place, fails `.github/workflows/ai-canary.yml`. The job adds the `unreviewed-ai` label and comments. It reads the pull request through the API. It does not check out or run the pull request's code.

Code Home wires that workflow on `pull_request_target` and on issues. A push to `main` does not run it. The unit test in `canary/ai-canary.test.mjs` covers the mark and the checkbox.
