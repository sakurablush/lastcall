# Publish lastcall — fallback when trusted publishing is not configured.
# Preferred: push tag v* after merge; see docs/contributing/npm-publishing.md
$ErrorActionPreference = "Stop"

$version = node -p "require('./package.json').version"

npm run ci
npm run build
npm run docs:build
npm pack --dry-run
npm publish --access public

Write-Host "Published lastcall@$version"
Write-Host "Next: git tag v$version; git push origin v$version"
Write-Host "Tag push creates npm release + GitHub Release via publish.yml (preferred)."
