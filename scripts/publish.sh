#!/usr/bin/env bash
set -euo pipefail

# Fallback publish when trusted publishing is not configured.
# Preferred: push tag v* after merge — see docs/contributing/npm-publishing.md
VERSION="$(node -p "require('./package.json').version")"

npm run ci
npm run build
npm run docs:build
npm pack --dry-run
npm publish --access public

echo "Published lastcall@${VERSION}"
echo "Next: git tag v${VERSION} && git push origin v${VERSION}"
echo "Tag push creates npm release + GitHub Release via publish.yml (preferred)."
