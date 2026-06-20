# npm publishing

lastcall publishes to [npmjs.org](https://www.npmjs.com/package/lastcall) using **[npm trusted publishing](https://docs.npmjs.com/trusted-publishers)** (OpenID Connect from GitHub Actions). No long-lived `NPM_TOKEN` is required for CI releases.

## Trusted publisher setup (one-time)

On [npmjs.com](https://www.npmjs.com/package/lastcall) → **Settings** → **Trusted Publisher** → **GitHub Actions**, enter **exactly**:

| Field                    | Value                    |
| ------------------------ | ------------------------ |
| **Organization or user** | `sakurablush`            |
| **Repository**           | `lastcall`               |
| **Workflow filename**    | `publish.yml`            |
| **Environment name**     | _(leave empty)_          |
| **Allowed actions**      | ✅ **Allow npm publish** |

Notes:

- **Workflow filename** is the file name only (`publish.yml`), not `.github/workflows/publish.yml`. Case-sensitive.
- **Environment name** must stay empty unless you add `environment: …` to the publish job in `.github/workflows/publish.yml` and create a matching GitHub Environment — leave both empty for the default setup.
- **Self-hosted runners are not supported** — the workflow uses `ubuntu-latest` (GitHub-hosted).
- `package.json` → `repository.url` must be `git+https://github.com/sakurablush/lastcall.git` (already configured).

Click **Set up connection** after the package exists on npm and `publish.yml` is on `main`.

## First publish (bootstrap)

Trusted publishing is configured **per package** on npm. The package page must exist before you can add a trusted publisher.

**First release (`0.1.0`):** publish once from your machine:

```bash
npm login
bash scripts/publish.sh   # Windows: .\scripts\publish.ps1
```

Then complete **Trusted publisher setup** above. From **`0.1.1` onward**, push a `v*` tag and CI handles npm + GitHub Release.

## Release procedure (maintainers)

1. Merge release PR to `main` with `package.json` version and `CHANGELOG.md` updated.
2. Tag and push (version must match `package.json`):

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. **Publish** workflow runs automatically (`.github/workflows/publish.yml`) — publishes to npm **and** creates a **GitHub Release** from the matching `CHANGELOG` section.

The workflow runs `npm run ci`, `npm run build`, `npm pack --dry-run`, then `npm publish` via OIDC, then `softprops/action-gh-release` with notes from `scripts/extract-changelog-section.mjs`. npm attaches **provenance** automatically for public repos.

**Manual GitHub Release is no longer required** when publishing via tag push.

## Manual publish (fallback)

If trusted publishing is not configured yet:

```bash
npm login
bash scripts/publish.sh   # Windows: .\scripts\publish.ps1
git tag v$(node -p "require('./package.json').version")
git push origin v$(node -p "require('./package.json').version")
```

Do **not** set `NODE_AUTH_TOKEN` in the publish workflow when using trusted publishing — it disables OIDC.

## npm package metadata

| Field          | Source                            | npm sidebar       |
| -------------- | --------------------------------- | ----------------- |
| **Homepage**   | `package.json` → `homepage`       | Link at top right |
| **Repository** | `package.json` → `repository.url` | GitHub link       |
| **README**     | `README.md` (included in tarball) | Readme tab        |

Homepage is set to the **GitHub Pages docs site** (`https://sakurablush.github.io/lastcall/`), not the repository README anchor. Republish to refresh npm metadata after changing `homepage`.

## Related

- [CI and automation](./ci-and-automation.md)
- [DEPLOYMENT.md](../DEPLOYMENT.md) — docs site
- [Trusted publishers (npm Docs)](https://docs.npmjs.com/trusted-publishers)
