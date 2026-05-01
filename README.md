# git-install

> Search, install, and uninstall GitHub repositories from your AI coding tools.

`@ojesusmp/git-install` is an npm CLI that teaches Claude Code and OpenAI Codex how to find, install, and cleanly remove GitHub repositories — with code-enforced safety guards, atomic file operations, and SHA-pinned installs.

Built by **Orlando Molina** ([@ojesusmp](https://github.com/ojesusmp)).

## Prerequisites

- Node.js >= 20
- git
- gh CLI (optional — used for faster ref resolution; falls back to `git ls-remote` and GitHub REST API)

## Quickstart

Run setup once to install the skill files into your AI tool's config directory:

```sh
npx @ojesusmp/git-install setup --claude
npx @ojesusmp/git-install setup --codex
npx @ojesusmp/git-install setup --both
```

Then trigger the skill from your AI tool:

```
repo install owner/repo
```

## Features

- **Cross-platform** — tested on Windows, macOS, and Linux via GitHub Actions CI
- **Code-enforced safety** — protected-directory allowlist, TTY confirmation gates, and SHA pinning are enforced in source code (`src/safety/`), not by LLM instruction
- **Atomic file operations** — backup-write-rename pattern with orphan recovery on next run
- **TTY confirmation gates** — installs require typing `confirm`; uninstalls require typing `confirm uninstall`
- **SHA pinning** — every install resolves and records the exact commit SHA; mutable refs (branches, tags) trigger a warning
- **Exit code taxonomy** — machine-readable exit codes for scripting

## CLI Usage

### Setup

Copy skill files into your AI tool's config directory:

```sh
git-install setup --claude     # ~/.claude/skills/install-repo/
git-install setup --codex      # ~/.codex/skills/install-repo/
git-install setup --both       # both targets
```

### Search

```sh
git-install repo search owner/repo
git-install repo search "natural language description"
git-install repo search https://github.com/owner/repo
```

### Install

```sh
git-install repo install owner/repo
git-install repo install owner/repo@v1.2.3
git-install repo install owner/repo@abc1234def   # SHA pin — immutable
git-install repo install https://github.com/owner/repo
```

### Uninstall

```sh
git-install repo uninstall repo-name
```

## Safety

The CLI enforces a hardcoded protected-directory allowlist that blocks writes to `~/.claude`, `~/.codex`, `~/.ssh`, `~/.aws`, and other sensitive paths. This guard operates on the CLI's own file operations — it does not sandbox arbitrary shell commands an AI assistant might run after reading repo content.

See [docs/SAFETY_MODEL.md](docs/SAFETY_MODEL.md) for the full threat model, code-enforced primitives, and limitations.

## Documentation

| Document                                           | Description                                                   |
| -------------------------------------------------- | ------------------------------------------------------------- |
| [docs/INSTALL.md](docs/INSTALL.md)                 | Prerequisites, installation, verification, uninstall          |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md)           | CLI usage, confirmation UX, exit codes, environment variables |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | TypeScript dev setup, project structure, TDD policy, release  |
| [docs/SAFETY_MODEL.md](docs/SAFETY_MODEL.md)       | Safety primitives, threat model, limitations                  |
| [CONTRIBUTING.md](CONTRIBUTING.md)                 | PR requirements, commit conventions, issue templates          |
| [CHANGELOG.md](CHANGELOG.md)                       | Version history and breaking changes                          |

## License

MIT — see [LICENSE](LICENSE).
