# install-repo skill

Reusable Codex and Claude skill for finding, inspecting, installing, and conservatively uninstalling GitHub repositories.

## What It Does

- `repo search <query>` searches by repo name, GitHub account, `owner/repo`, URL, commit ref, or natural-language description.
- `repo install <query>` and `install repo <query>` search or resolve a repo, inspect official installation docs, install into a local clone folder, and verify the result.
- `repo uninstall <query>` identifies installed repos, inspects uninstall docs and local side effects, then presents a confirmation-required removal plan.

Default local clone root used by the skill:

```text
D:\[002]Codex_ChatGPT\installed-repos
```

## Repo Layout

```text
codex/install-repo/SKILL.md
codex/install-repo/agents/openai.yaml
claude/install-repo/SKILL.md
scripts/install-codex.ps1
scripts/install-claude.ps1
```

## Install For Codex

```powershell
.\scripts\install-codex.ps1
```

This copies the Codex skill to:

```text
$env:USERPROFILE\.codex\skills\install-repo
```

## Install For Claude

```powershell
.\scripts\install-claude.ps1
```

This copies the Claude skill to:

```text
$env:USERPROFILE\.claude\skills\install-repo
```

## Safety Model

Installation is allowed to run official setup commands after the user selects a repo. Uninstall is intentionally stricter: the skill must inspect official docs, local files, package managers, hooks, skills, prompts, MCP entries, config, and AI-tool roots before proposing removal. It must not remove files or global packages until the user explicitly confirms the uninstall plan.

## Validation

For Codex skill validation, run:

```powershell
python C:/Users/molin/.codex/skills/.system/skill-creator/scripts/quick_validate.py ./codex/install-repo
```
