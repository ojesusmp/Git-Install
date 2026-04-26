# Developer Guide

## Setup

```sh
git clone https://github.com/ojesusmp/git-install.git
cd git-install
npm install
```

Node.js >= 20 is required.

## Project Structure

```
src/
  cli.ts                        Entry point, command registration
  commands/
    setup.ts                    git-install setup
    search.ts                   git-install repo search
    install.ts                  git-install repo install
    uninstall.ts                git-install repo uninstall
  safety/
    protected-dirs.ts           Protected-directory allowlist and isProtected()
    atomicity.ts                atomicWrite() and recoverFromInterrupt()
    ref-resolver.ts             resolveRef() — SHA resolution with mutable-ref warning
  lib/
    data-dir.ts                 Platform-aware data directory (XDG / AppData / fallback)
    install-record.ts           installs.json schema (zod), load/add/remove
    lockfile.ts                 PID-based lockfile acquire/release
    git.ts                      cloneRepo(), checkoutRef(), revParseHead()
    github.ts                   searchRepos() — gh / git ls-remote / REST fallback chain
    prompt.ts                   assertTTY(), confirmInstall(), confirmUninstall()
  skills/
    claude/install-repo/        Claude skill files (shipped in dist/)
    codex/install-repo/         Codex skill files (shipped in dist/)

tests/
  commands/                     Tests for setup, search, install, uninstall
  safety/                       Tests for protected-dirs, atomicity, ref-resolver
  lib/                          Tests for data-dir, install-record, lockfile, git, github
  skills/                       skill-description.test.ts (word-count assertion)
```

## Scripts

```sh
npm run typecheck       # tsc --noEmit (strict TypeScript, zero errors required)
npm test                # vitest run (all tests)
npm run test:coverage   # vitest run --coverage (must reach >= 80% on src/)
npm run lint            # ESLint v9 flat config
npm run format:check    # Prettier check
npm run format          # Prettier write
npm run build           # tsup (compiles src/ to dist/, copies skills/)
```

## Coding Conventions

- **TypeScript strict mode** — `tsconfig.json` enables `strict: true`. No `any` without justification.
- **ESM modules** — `"type": "module"` in `package.json`. Use `.js` extensions in imports even for `.ts` source files.
- **Prettier formatting** — enforced by CI. Run `npm run format` before committing.
- **ESLint v9 flat config** — `eslint.config.js`. All lint warnings are treated as errors in CI.

## TDD Policy

Safety primitives in `src/safety/` are written test-first:

1. Write a failing test in `tests/safety/`.
2. Write the minimal implementation in `src/safety/<name>.ts`.
3. Export from `src/safety/index.ts` if an index exists.
4. Run `npm test` — test must pass.

Coverage target: >= 80% on `src/`. Check with `npm run test:coverage`.

## CI

GitHub Actions runs a matrix build on every push and pull request:

- **OS**: Windows, macOS, Linux
- **Node**: 20

All three jobs must pass: `typecheck`, `test` (vitest, >= 80% coverage), `lint`, `format:check`.

A publish workflow triggers on tags matching `v*`. Pre-release versions (containing `-` in the version string, e.g. `1.0.0-beta.1`) are published with `--tag next`.

## Adding a New Safety Primitive

1. Create `tests/safety/<name>.test.ts` and write failing tests.
2. Create `src/safety/<name>.ts` with the implementation.
3. Export the new primitive from the safety module.
4. Run `npm test` and confirm all tests pass.
5. Run `npm run test:coverage` and confirm coverage stays >= 80%.

## Adding a New Command

1. Create `tests/commands/<name>.test.ts` and write failing tests.
2. Create `src/commands/<name>.ts` with the implementation.
3. Register the command in `src/cli.ts`.
4. Run `npm test` and confirm all tests pass.

## Skill File Changes

Skill files live in `src/skills/claude/install-repo/` and `src/skills/codex/install-repo/`. The build step copies them to `dist/skills/` so they ship with the npm package.

When editing skill files:

- Keep the `description` field in Claude's `SKILL.md` frontmatter to <= 30 words. The `tests/skills/skill-description.test.ts` test enforces this.
- Run `npm test` to confirm the word-count test passes.
- Run `npm run build` to verify the files are copied to `dist/skills/`.

## Release

1. Update `CHANGELOG.md` with the new version entry.
2. Bump the version in `package.json`.
3. Commit and push.
4. Create and push a tag: `git tag v1.x.x && git push origin v1.x.x`
5. The publish workflow runs automatically on tag push.

For pre-releases, use a version with a `-` (e.g. `1.1.0-beta.1`). The workflow detects the `-` and publishes with `--tag next` instead of `--tag latest`.
