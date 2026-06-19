# PM2 Cluster Mode

```ts
import { createLastcall } from 'lastcall';

const lastcall = createLastcall();

lastcall.register('cleanup', async () => {
  // Close resources
});

// PM2 sends SIGINT by default; lastcall handles SIGTERM and SIGINT
```

## ecosystem.config.js

```js
module.exports = {
  apps: [
    {
      name: 'my-app',
      script: './dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
```

## Tips

- Set `kill_timeout` to match your `shutdownTimeoutMs`
- Each cluster worker gets its own lastcall instance
- Use `process.send('ready')` with PM2 `wait_ready` for zero-downtime reloads
