# Git-Install

Install git repos from your Claude Code or Codex.

Git-Install is a portable skill package for Codex and Claude that helps an AI assistant search GitHub repositories, install selected projects from official instructions, and safely plan repo uninstall/removal.

Created by Orlando Molina.

## What This Is

This repository contains two versions of the same skill:

- `codex/install-repo/` for Codex
- `claude/install-repo/` for Claude

The skill adds three user-facing flows:

- `repo search <query>`: find repositories by name, account, `owner/repo`, URL, commit ref, or natural-language description.
- `repo install <query>` or `install repo <query>`: search/resolve a repository, inspect official install docs, install it, and verify it.
- `repo uninstall <query>`: inspect the installed repo and related configuration, then produce a safe uninstall plan before removing anything.

## Quick Start

Install for Codex:

```powershell
.\scripts\install-codex.ps1
```

Install for Claude:

```powershell
.\scripts\install-claude.ps1
```

Default clone location used by the skill:

```text
D:\[002]Codex_ChatGPT\installed-repos
```

## Example Prompts

Search only:

```text
repo search a CLI that compresses LLM prompts
```

Install after choosing from a numbered list:

```text
repo install caveman
```

Install a direct repo:

```text
repo install JuliusBrussee/caveman
```

Install a specific commit:

```text
repo install JuliusBrussee/caveman@abc1234
```

Plan uninstall:

```text
repo uninstall oh-my-codex
```

## Repository Layout

```text
codex/install-repo/SKILL.md              Codex skill instructions
codex/install-repo/agents/openai.yaml    Codex UI metadata
claude/install-repo/SKILL.md             Claude skill instructions
scripts/install-codex.ps1                Copies the Codex skill into ~/.codex
scripts/install-claude.ps1               Copies the Claude skill into ~/.claude
docs/USER_GUIDE.md                       Plain-language usage guide
docs/DEVELOPER_GUIDE.md                  Maintainer and implementation guide
docs/SAFETY_MODEL.md                     Install/uninstall safety rules
```

## Safety Summary

Installation is allowed only after the repo is selected or uniquely identified. Uninstall is stricter: the skill must inspect official docs, local clones, package managers, hooks, config, skills, prompts, MCP entries, and AI-tool roots before proposing removal.

The skill should never broadly delete or rewrite:

- `~/.codex`
- `~/.claude`
- `.omx`
- `.omc`
- credentials
- auth files
- shared config
- hooks
- prompts
- skills

See [docs/SAFETY_MODEL.md](docs/SAFETY_MODEL.md).

## Validation

Validate the Codex skill:

```powershell
python C:/Users/molin/.codex/skills/.system/skill-creator/scripts/quick_validate.py ./codex/install-repo
```

Basic Claude validation is structural: confirm `claude/install-repo/SKILL.md` has frontmatter with `name` and `description`, and includes the search/install/uninstall workflows.

## Credits

Created by Orlando Molina.

Implementation assistance by Codex.
