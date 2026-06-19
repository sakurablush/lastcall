#!/usr/bin/env node
/**
 * Extract a Keep a Changelog section for a release version.
 * Usage: node scripts/extract-changelog-section.mjs 0.2.0
 * Writes CHANGELOG_OUT (default: release-notes.md) or prints to stdout with --stdout.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const toStdout = args.includes('--stdout');
const versionArg = args.find((a) => a !== '--stdout');

if (!versionArg || !/^\d+\.\d+\.\d+$/.test(versionArg.replace(/^v/, ''))) {
  console.error('Usage: node scripts/extract-changelog-section.mjs <version> [--stdout]');
  process.exit(1);
}

const version = versionArg.replace(/^v/, '');
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const header = `## [${version}]`;
const start = changelog.indexOf(header);

if (start === -1) {
  console.error(`Changelog section not found: ${header}`);
  process.exit(1);
}

const afterHeader = changelog.indexOf('\n', start) + 1;
const nextSection = changelog.indexOf('\n## [', afterHeader);
const body = changelog.slice(afterHeader, nextSection === -1 ? undefined : nextSection).trim();

if (!body) {
  console.error(`Changelog section for ${version} is empty`);
  process.exit(1);
}

if (toStdout) {
  process.stdout.write(body);
} else {
  const outPath = process.env.CHANGELOG_OUT ?? 'release-notes.md';
  writeFileSync(outPath, `${body}\n`, 'utf8');
  console.log(`Wrote ${outPath} (${body.length} chars)`);
}
