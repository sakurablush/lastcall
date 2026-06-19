# Cursor Agent Skills & Rules

This repository ships **project skills** and **project rules** for [Cursor](https://cursor.com/) — structured playbooks that teach the agent how to develop, test, and document lastcall correctly.

- Skills: `.cursor/skills/` (workflows, checklists)
- Rules: `.cursor/rules/` (personas, mandatory policies)

They complement human docs in `docs/`. Official references: [Cursor Rules](https://cursor.com/docs/rules) · [Agent Skills](https://cursor.com/docs/context/skills).

## Quick reference — skills

| Skill                          | When it loads                                    | Invoke manually                 |
| ------------------------------ | ------------------------------------------------ | ------------------------------- |
| `lastcall-contributing`        | Auto when editing `src/`, `test/`, `examples/`   | `/lastcall-contributing`        |
| `lastcall-docs`                | Auto when editing `docs/`, `website/`, skills    | `/lastcall-docs`                |
| `lastcall-pre-commit-ci`       | Auto when editing `src/`, `test/`, skills        | `/lastcall-pre-commit-ci`       |
| `lastcall-release-versioning`  | Auto when editing `CHANGELOG.md`, `package.json` | `/lastcall-release-versioning`  |
| `lastcall-local-testing`       | Never auto — explicit only                       | `/lastcall-local-testing`       |
| `lastcall-onboarding`          | Never auto — explicit only                       | `/lastcall-onboarding`          |
| `lastcall-ship-release`        | Never auto — explicit only                       | `/lastcall-ship-release`        |
| `lastcall-review-before-merge` | Never auto — explicit only                       | `/lastcall-review-before-merge` |

## Quick reference — rules

| Rule                         | Trigger type      | When it applies                                                           |
| ---------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `pre-commit-quality-gate`    | **File patterns** | Auto when editing `src/`, `test/`, `examples/`, skills — run `npm run ci` |
| `lastcall-release-changelog` | **File patterns** | Auto when editing library or release files — CHANGELOG + semver           |
| `aether-engineer`            | **Manual** (`@`)  | Implementation with plan tracking                                         |
| `aether-planner`             | **Manual** (`@`)  | Plan mode — architecture without code                                     |
| `aether-reviewer`            | **Manual** (`@`)  | Code or PR review                                                         |
| `aether-debugger`            | **File patterns** | Debug `src/` and `test/` failures                                         |
| `aether-test-engineer`       | **File patterns** | Deep test design in `test/`                                               |
| `aether-security-auditor`    | **Manual** (`@`)  | Security audit of shutdown/signal code                                    |
| `aether-advisor`             | **Manual** (`@`)  | Ask mode — Q&A without code changes                                       |

**No rule uses `alwaysApply: true`** — context stays lean; policies attach when files match or you `@`-mention a persona.

## How to use in Cursor

1. Open the repo in Cursor.
2. **Skills:** type `/` + skill name, or let the agent auto-load scoped skills when you edit matching files.
3. **Rules:** type `@` + rule name for Aether personas.
4. View everything in **Cursor Settings → Rules**.

**Example prompts:**

```
/lastcall-onboarding I'm new — what should I run first?

/lastcall-local-testing Run the full test suite with proof logging

/lastcall-ship-release Prepare release 0.2.0 end-to-end

/lastcall-review-before-merge Review this branch before I open a PR

@aether-engineer Implement handler X with a tracked execution plan
```

Skills and rules are **optional accelerators**. Everything they contain is also documented in `docs/` for non-Cursor workflows.

## What not to commit

Ephemeral AI plans (`.cursor/plans/`, `*-plan.md`) are gitignored. **Skills and rules are tracked** — they are shared contributor tooling.

## Related

- `CONTRIBUTING.md` — human contributor guide
- [CI and automation](./ci-and-automation.md) — GitHub Actions
