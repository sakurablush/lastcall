# GitHub Pages deployment

This documentation site is built with [VitePress](https://vitepress.dev/).

## Local development

```bash
npm run docs:dev
# http://localhost:5173
```

## Production build

```bash
npm run docs:build
npm run docs:preview
```

For GitHub Pages project sites:

```bash
VITEPRESS_BASE=/lastcall/ npm run docs:build
```

## Enable GitHub Pages

1. Push to `main` (or `master`)
2. Repository **Settings → Pages → Source** → **GitHub Actions**
3. The `Docs` workflow deploys on every push to `main` or `master`

## Structure

```
docs/           # Markdown content (srcDir)
website/        # VitePress config + theme
  .vitepress/
    config.ts
    theme/
```

## CI

- `ci.yml` — validates docs build on every PR
- `docs.yml` — deploys to GitHub Pages

Site URL: `https://sakurablush.github.io/lastcall/`
