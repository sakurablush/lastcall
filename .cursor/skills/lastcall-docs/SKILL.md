---
name: lastcall-docs
description: Updates lastcall documentation and the VitePress site — docs map, npm run docs:build, verification matrix, API reference sync, cursor-skills maintenance. Use when editing docs/, website/, feature pages, or documentation-only CHANGELOG entries.
paths:
  - docs/**
  - website/**
  - .cursor/skills/**
---

# lastcall Documentation

Human docs: `docs/` · Skill index: `docs/contributing/cursor-skills.md`

## Layout

```
docs/                    # Markdown source (not published to npm)
  public/                # Static assets (logo.svg)
website/                 # VitePress site root
  .vitepress/config.ts   # Nav, sidebar, base path, head meta
  .vitepress/theme/      # custom.css + theme extension
```

**npm package ships only:** `dist/`, `README.md`, `LICENSE`.

## Commands

| Command                | Purpose                           |
| ---------------------- | --------------------------------- |
| `npm run docs:dev`     | Local preview (hot reload)        |
| `npm run docs:build`   | Static build — **required in CI** |
| `npm run docs:preview` | Preview production build          |

CI sets `VITEPRESS_BASE=/${{ github.event.repository.name }}/` for GitHub Pages.

## Documentation map

| Topic           | Path                                     |
| --------------- | ---------------------------------------- |
| Getting started | `docs/getting-started.md`                |
| Cursor skills   | `docs/contributing/cursor-skills.md`     |
| CI / automation | `docs/contributing/ci-and-automation.md` |
| Architecture    | `docs/architecture/`                     |
| Features        | `docs/features/`                         |
| API reference   | `docs/api/reference.md`                  |
| Testing         | `docs/testing/`                          |
| Deployment      | `docs/DEPLOYMENT.md`                     |
| Security        | `docs/security-policy.md`, `SECURITY.md` |

## When behavior changes

1. Feature doc — `docs/features/<topic>.md`
2. API reference — `docs/api/reference.md`
3. Verification matrix — `docs/testing/verification-matrix.md` + `test/verification-matrix.test.ts`
4. Examples — `examples/`, `docs/examples/index.md`
5. README — if install or quick-start changes
6. CHANGELOG — `[Unreleased]` for notable changes
7. Cursor skills/rules — if workflows change (`.cursor/`, `docs/contributing/cursor-skills.md`)

## PR checklist (docs-only)

```
- [ ] npm run docs:build passes
- [ ] verification matrix updated if coverage changed
- [ ] API reference matches src/index.ts exports
- [ ] cursor-skills.md updated if skill workflows changed
```

## Related

- `.github/workflows/docs.yml`
- `@lastcall-contributing` — full PR gate
