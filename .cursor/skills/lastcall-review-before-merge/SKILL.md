---
name: lastcall-review-before-merge
description: Pre-merge review for lastcall — CI gate, Bugbot code review, and optional security review before PR or release. Use when the user asks for review before commit, merge, or opening a PR.
disable-model-invocation: true
---

# Review Before Merge

Run structured review before merge or release. Fix blockers before commit.

## Order

1. **CI** — `.cursor/skills/lastcall-pre-commit-ci/SKILL.md` must pass first.
2. **Bugbot** — launch one `bugbot` subagent (`readonly: true`):

```text
Full Repository Path: <workspace root>
Diff: branch changes
```

Use `uncommitted changes` for dirty tree only.

3. **Security** (when signal handling, process.exit, or exception capture changed) — `@aether-security-auditor` or the `review-security` skill.

## Bugbot summary format

| Severity | Location (file:line) | Finding |

Sort by severity (highest first). Do not fix findings unless the user asks.

## After review

- Blockers → fix and re-run CI + review.
- Clean → proceed to commit/PR per user request.

## Rule reference

`@aether-reviewer` for human-style architecture review.
