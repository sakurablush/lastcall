# Docker + Kubernetes

## Dockerfile

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
USER node
CMD ["node", "dist/index.js"]
```

## Kubernetes deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          lifecycle:
            preStop:
              exec:
                command: ['sh', '-c', 'sleep 5']
          terminationGracePeriodSeconds: 45
```

## Best practices

1. Set `terminationGracePeriodSeconds` higher than your `shutdownTimeoutMs` (default 30s).
2. Use `preStop` hook to allow load balancer drain before SIGTERM.
3. Mark health checks unhealthy in a `pre` phase handler:

```ts
lastcall.register(
  'health',
  async () => {
    isHealthy = false;
  },
  { phase: 'pre', priority: 1 },
);
```

4. Register HTTP server with `withHttpServer()` in the `drain` phase (default).
5. Close database connections in the `cleanup` phase.

## Signal flow

```
K8s delete pod → preStop sleep → SIGTERM → lastcall shutdown → handlers → exit 0
```
