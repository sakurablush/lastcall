---
layout: home

hero:
  name: lastcall
  text: Graceful shutdown for Node.js
  tagline: Register cleanup handlers, drain HTTP servers, and exit cleanly on SIGTERM — full line coverage with integration tests via child processes
  image:
    src: /logo.svg
    alt: lastcall logo
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: API Reference
      link: /api/reference
    - theme: alt
      text: GitHub
      link: https://github.com/sakurablush/lastcall
    - theme: alt
      text: npm
      link: https://www.npmjs.com/package/lastcall

features:
  - icon: 🔔
    title: Last call metaphor
    details: Finish in-flight work, then shut down — like closing time at a bar
  - icon: 📶
    title: Signal-aware
    details: SIGTERM, SIGINT, SIGHUP — built for Docker, Kubernetes, and PM2
  - icon: 🌊
    title: Phased shutdown
    details: pre → drain → cleanup → post with priorities and dependencies
  - icon: 🌐
    title: HTTP drain
    details: withHttpServer() stops accepting connections and drains in-flight requests
  - icon: 📊
    title: Observable
    details: Lifecycle events, metrics hooks, and optional verbose test logging
  - icon: ✅
    title: Verified
    details: Full line/function coverage, integration tests via child processes, verification matrix enforced in CI
---

## Quick example

```ts
import { createLastcall } from 'lastcall';

const lastcall = createLastcall();

lastcall.withHttpServer(server);
lastcall.register(
  'database',
  async () => {
    await db.disconnect();
  },
  { critical: true, phase: 'cleanup' },
);
```

Send SIGTERM — lastcall runs your handlers in order and exits.
