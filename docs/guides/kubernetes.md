# Kubernetes

## Deployment snippet

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 45
      containers:
        - name: app
          image: my-app:latest
          lifecycle:
            preStop:
              exec:
                command: ['sh', '-c', 'sleep 5']
```

## Application setup

```ts
import { createLastcall } from 'lastcall';

const lastcall = createLastcall({ shutdownTimeoutMs: 30_000 });

// 1. Mark unhealthy (pre phase)
lastcall.register(
  'health',
  async () => {
    isHealthy = false;
  },
  { phase: 'pre', priority: 1 },
);

// 2. Drain HTTP (drain phase)
lastcall.withHttpServer(server);

// 3. Close resources (cleanup phase)
lastcall.register(
  'database',
  async () => {
    await db.disconnect();
  },
  { critical: true },
);
```

## Timing checklist

| Setting                         | Recommendation                          |
| ------------------------------- | --------------------------------------- |
| `terminationGracePeriodSeconds` | > `shutdownTimeoutMs` + `preStop` sleep |
| `preStop` sleep                 | 3–5s for load balancer drain            |
| `shutdownTimeoutMs`             | 25–30s typical                          |

## Signal flow

```
kubectl delete pod
  → preStop sleep (5s)
  → SIGTERM
  → lastcall shutdown
  → handlers (pre → drain → cleanup → post)
  → exit 0
  → pod removed
```

If shutdown exceeds `terminationGracePeriodSeconds`, Kubernetes sends SIGKILL.
