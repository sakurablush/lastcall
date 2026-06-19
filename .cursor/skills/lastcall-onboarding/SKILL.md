---
name: lastcall-onboarding
description: Orients new contributors to the lastcall repository — what the library does, repo layout, first commands, and which skill or rule to attach next. Use when someone is new to lastcall, asks what the project is, or needs a quick start before coding or testing.
disable-model-invocation: true
---

# lastcall Onboarding

## What this project is

**lastcall** is a zero-dependency TypeScript library for graceful process shutdown in Node.js and Bun:

- SIGTERM / SIGINT / SIGHUP handling
- Phased shutdown: `pre` → `drain` → `cleanup` → `post`
- Handler priorities, dependencies, and per-handler timeouts
- HTTP server drain via `withHttpServer()`
- Lifecycle events and metrics hooks
- Test utilities: `simulateSignal()`, `autoExit: false`

## Repo layout

```
src/           # Library source (published as dist/)
test/          # Vitest — unit, integration (child_process IPC), verification matrix
examples/      # Runnable framework examples (express, fastify, hono, …)
docs/          # Markdown documentation (VitePress srcDir)
website/       # VitePress config + theme
.cursor/skills/  # Cursor Agent Skills (see docs/contributing/cursor-skills.md)
.cursor/rules/   # Cursor project rules (personas + mandatory policies)
.github/       # CI, docs deploy, publish, Dependabot, labeler
```

**Note:** Local folder may still be named `lifeline` — npm package name is `lastcall`.

## First 5 minutes

```bash
git clone https://github.com/sakurablush/lastcall.git
cd lastcall
npm ci
npm run ci        # lint, format, typecheck, coverage, docs
npm run build
```

## Choose your path

| Goal                 | Attach skill / rule             | Human doc                             |
| -------------------- | ------------------------------- | ------------------------------------- |
| Change code, open PR | `@lastcall-contributing`        | `docs/contributing.md`                |
| Run all tests        | `/lastcall-local-testing`       | `docs/testing/running-tests.md`       |
| Ship a release       | `/lastcall-ship-release`        | `docs/DEPLOYMENT.md`                  |
| Pre-merge review     | `/lastcall-review-before-merge` | —                                     |
| Edit documentation   | `@lastcall-docs`                | `docs/contributing/cursor-skills.md`  |
| Understand the API   | —                               | `docs/getting-started.md`             |
| How we know it works | —                               | `docs/testing/verification-matrix.md` |

## Minimal usage

```ts
import { createServer } from 'node:http';
import { createLastcall } from 'lastcall';

const server = createServer((req, res) => res.end('ok'));
const lastcall = createLastcall();

lastcall.withHttpServer(server);
lastcall.register(
  'db',
  async () => {
    await db.disconnect();
  },
  { critical: true },
);

server.listen(3000);
```

## Key concepts

| Concept              | Detail                                               |
| -------------------- | ---------------------------------------------------- |
| `createLastcall()`   | New instance per process (or `getDefaultLastcall()`) |
| `register(name, fn)` | Shutdown handler with phase, priority, deps          |
| `withHttpServer()`   | Register **before** `listen()`                       |
| `simulateSignal()`   | Test signal path without OS signals                  |
| `autoExit: false`    | Required in tests to avoid `process.exit()`          |

## Peer stack

Consumers install only `lastcall`. Examples may use Express, Fastify, Hono, etc. as dev deps.
