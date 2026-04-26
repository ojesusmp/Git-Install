# Changelog

## v1.0.0 (unreleased) — TypeScript Rewrite

**BREAKING CHANGES — complete rewrite from PowerShell helper scripts to npm TypeScript CLI.**

### Added

- npm package `@ojesusmp/git-install` (Node >= 20)
- CLI commands: `setup`, `repo search`, `repo install`, `repo uninstall`
- Cross-platform support: Windows, macOS, Linux (CI tested all 3)
- Code-enforced protected-directory allowlist (`src/safety/protected-dirs.ts`)
- TTY confirmation gates (literal `confirm` / `confirm uninstall`)
- SHA resolution + install record (`installs.json` with `schemaVersion: 1`)
- Atomic file operations with orphan recovery
- PID-based lockfile for concurrent operation safety
- Git hook neutralization on clone (`core.hooksPath=/dev/null`)
- Case-insensitive path comparison on Windows
- Exit code taxonomy (0=success, 1=error, 2=safety, 3=cancel, 4=prereq)
- `GIT_INSTALL_NONINTERACTIVE=1` env-var bypass for confirmation
- XDG_DATA_HOME / LOCALAPPDATA respect for data directory
- GitHub Actions CI (3-OS matrix) + publish workflow with `--tag next` for pre-release
- Vitest test suite (>= 80% coverage on `src/`)

### Removed

- **BREAKING**: `scripts/install-claude.ps1` and `scripts/install-codex.ps1` (PowerShell helper scripts). Use `npx @ojesusmp/git-install setup --claude` or `--codex` instead.
- Old root-level skill source directories `claude/install-repo/` and `codex/install-repo/`. These have been moved to `src/skills/{claude,codex}/install-repo/` and ship inside the npm package. Use `git-install setup --claude` (or `--codex`) to install them.
- Hardcoded developer machine path from documentation
- Inline `Copy-Item` / `cp -R` install snippets

### Changed

- **BREAKING**: SKILL.md `description` field trimmed from 195+ words to <= 30 words (Anthropic spec compliance, improves LLM routing match precision)
- Skill files now ship inside the npm package (`dist/skills/`); the CLI copies them via `setup` command — no manual copy needed
- Documentation fully rewritten for the npm CLI workflow

### Fixed

- Helper scripts no longer suffer from `Copy-Item -LiteralPath` + wildcard misuse (replaced by Node `fs.copyFile` + atomicWrite pattern)
- Cross-platform parity: helpers were Windows-only PowerShell; CLI works identically on all 3 OS targets

### Migration

Users of the old PowerShell scripts should:

1. Install the new CLI: `npm install -g @ojesusmp/git-install` or use `npx`.
2. Run `git-install setup --claude` (and/or `--codex`) to install skill files.
3. The old `scripts/*.ps1` files are removed; do not source or run them.

---

## v0.1.0

- Initial repository package.
- Codex skill variant.
- Claude skill variant.
- PowerShell install scripts for Codex and Claude.
- User, developer, and safety documentation.
