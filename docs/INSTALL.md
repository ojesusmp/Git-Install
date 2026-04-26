# Installation Guide

## Prerequisites

| Requirement | Version | Notes                               |
| ----------- | ------- | ----------------------------------- |
| Node.js     | >= 20   | Required                            |
| git         | any     | Required for cloning                |
| gh CLI      | any     | Optional — speeds up ref resolution |

## Install the CLI

### Option A: global install

```sh
npm install -g @ojesusmp/git-install
```

After this, `git-install` is available as a command on your PATH.

### Option B: use without installing

```sh
npx @ojesusmp/git-install <command>
```

No install needed. npm downloads and runs the package directly.

## Set Up Skill Files

Run `setup` to copy the skill files into your AI tool's config directory:

```sh
# Claude Code only
git-install setup --claude

# OpenAI Codex only
git-install setup --codex

# Both
git-install setup --both
```

With `npx`:

```sh
npx @ojesusmp/git-install setup --claude
npx @ojesusmp/git-install setup --both
```

Setup writes skill files to:

- Claude: `~/.claude/skills/install-repo/`
- Codex: `~/.codex/skills/install-repo/`

The setup command prints each file path written and a file count.

## Verify

Check the CLI version and help:

```sh
git-install --version
git-install --help
```

Confirm skill files were written:

```sh
# macOS / Linux
ls ~/.claude/skills/install-repo/
ls ~/.codex/skills/install-repo/

# Windows (PowerShell)
dir $env:USERPROFILE\.claude\skills\install-repo\
dir $env:USERPROFILE\.codex\skills\install-repo\
```

Then trigger a search from your AI tool to confirm the skill loads:

```
repo search git-install
```

## Update

Re-run setup after updating the CLI to replace skill files with the latest version:

```sh
npm update -g @ojesusmp/git-install
git-install setup --both
```

## Uninstall

Remove the CLI:

```sh
npm uninstall -g @ojesusmp/git-install
```

Remove skill files manually:

```sh
# macOS / Linux
rm -rf ~/.claude/skills/install-repo/
rm -rf ~/.codex/skills/install-repo/
```

On Windows, delete these directories:

```
%USERPROFILE%\.claude\skills\install-repo\
%USERPROFILE%\.codex\skills\install-repo\
```

## Troubleshooting

**"TTY required" error**

`git-install repo install` and `git-install repo uninstall` require an interactive terminal for confirmation prompts. Run from a real terminal, not a piped or non-interactive shell.

To bypass TTY for scripting or CI:

```sh
GIT_INSTALL_NONINTERACTIVE=1 git-install repo install owner/repo
```

This auto-confirms all prompts and logs a `WARN` message.

**gh not found**

The gh CLI is optional. If it is not on your PATH, ref resolution falls back to `git ls-remote` and then the GitHub REST API. Install gh from <https://cli.github.com> for faster resolution and private repo support.
