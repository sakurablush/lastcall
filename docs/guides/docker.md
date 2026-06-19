# Docker

## Dockerfile

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
USER node
CMD ["node", "dist/index.js"]
```

## docker-compose

```yaml
services:
  app:
    build: .
    stop_grace_period: 45s
```

Docker sends **SIGTERM** on `docker stop`. lastcall handles it automatically.

## Best practices

1. Use `STOPSIGNAL SIGTERM` (Docker default)
2. Set `stop_grace_period` > your `shutdownTimeoutMs`
3. Register `withHttpServer()` for any HTTP service
4. Use `critical: true` on database handlers

## Health checks

During `pre` phase, mark your health endpoint unhealthy so the load balancer stops routing traffic before drain begins.
