# Contributing

See [CONTRIBUTING.md](https://github.com/sakurablush/lastcall/blob/main/CONTRIBUTING.md) in the repository.

## Quick start

```bash
git clone https://github.com/sakurablush/lastcall.git
cd lastcall
npm install
npm run ci
npm run docs:dev
```

## Cursor agent tooling

This repo ships shared [Cursor skills & rules](/contributing/cursor-skills) for consistent AI-assisted development. Skills and rules are **tracked in git**; `.cursor/plans/` is not.

## Requirements

- 100% line/function/statement coverage on new code
- Tests for every new feature
- Use `logStep` / `logProof` for demonstrable test behavior
- Update docs in `docs/` for user-facing changes
- Run `npm run ci` before opening a PR

## What not to commit

Do **not** commit AI-generated implementation plans (`.cursor/plans/`, `*-plan.md`, etc.). These are ephemeral and excluded via `.gitignore`.

## See also

- [CI & automation](/contributing/ci-and-automation)
- [Running tests](/testing/running-tests)
