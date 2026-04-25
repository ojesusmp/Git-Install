# Git-Install

Install GitHub repos from Claude Code or Codex.

Git-Install is a skill package created by Orlando Molina for people who want an AI assistant to search GitHub, inspect repositories, install selected projects from official instructions, and safely plan uninstall/removal when needed.

## What You Get

This repo includes the same idea packaged for two AI tools:

- `codex/install-repo/` for Codex
- `claude/install-repo/` for Claude

The skill gives your assistant three workflows:

- `repo search <query>`: search GitHub by name, account, `owner/repo`, URL, commit ref, or natural-language description.
- `repo install <query>` or `install repo <query>`: search or resolve a repo, inspect official install docs, install it, and verify it.
- `repo uninstall <query>`: inspect the installed repo and related configuration, then produce a safe uninstall plan before removing anything.

## Installation

The real installation method is simple: copy the skill folder into your AI tool's skill directory.

Helper scripts are included for convenience, but they are not magic and they are not the only way to install.

Read the full guide:

[docs/INSTALL.md](docs/INSTALL.md)

Quick Codex install from a cloned repo:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
Copy-Item -Recurse -Force ".\codex\install-repo" "$env:USERPROFILE\.codex\skills\"
```

Quick Claude install from a cloned repo:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
Copy-Item -Recurse -Force ".\claude\install-repo" "$env:USERPROFILE\.claude\skills\"
```

Optional helper scripts:

```powershell
.\scripts\install-codex.ps1
.\scripts\install-claude.ps1
```

## Example Prompts

These examples use this project itself.

Search:

```text
repo search Git-Install
repo search a skill that lets Codex or Claude install GitHub repos
```

Install:

```text
repo install ojesusmp/Git-Install
repo install https://github.com/ojesusmp/Git-Install
repo install ojesusmp/Git-Install@main
```

Uninstall:

```text
repo uninstall Git-Install
```

## Repository Layout

```text
codex/install-repo/SKILL.md              Codex skill instructions
codex/install-repo/agents/openai.yaml    Codex UI metadata
claude/install-repo/SKILL.md             Claude skill instructions
scripts/install-codex.ps1                Optional Codex install helper
scripts/install-claude.ps1               Optional Claude install helper
docs/INSTALL.md                          Installation guide
docs/USER_GUIDE.md                       Plain-language usage guide
docs/DEVELOPER_GUIDE.md                  Maintainer and implementation guide
docs/SAFETY_MODEL.md                     Install/uninstall safety rules
CONTRIBUTING.md                          Contribution guide
```

## Default Clone Location

The skill should clone installed repositories into:

```text
<current-project>/installed-repos
```

The user can always provide a different folder.

## Safety Summary

Install can proceed after the repo is selected or uniquely identified. Uninstall is stricter: the skill must inspect official docs, local clones, package managers, hooks, config, skills, prompts, MCP entries, and AI-tool roots before proposing removal.

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
