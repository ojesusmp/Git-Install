# Developer Guide

Git-Install is Orlando Molina's public-facing skill package for GitHub repo search, install, and uninstall workflows.

It packages the same workflow for two AI environments:

- Codex skill format under `codex/install-repo`
- Claude skill format under `claude/install-repo`

Created and owned by Orlando Molina.

## Design Goals

1. Make GitHub repository discovery easy from vague or precise input.
2. Keep install behavior practical: inspect official docs, run the likely default, verify.
3. Keep uninstall behavior conservative: inspect first, plan, confirm, then remove.
4. Avoid breaking Codex, Claude, OMX, OMC, MCP configuration, credentials, hooks, skills, or prompts.

## Skill Surfaces

### Codex

Files:

```text
codex/install-repo/SKILL.md
codex/install-repo/agents/openai.yaml
```

Validation:

```powershell
python C:/Users/molin/.codex/skills/.system/skill-creator/scripts/quick_validate.py ./codex/install-repo
```

### Claude

File:

```text
claude/install-repo/SKILL.md
```

Claude skills in this project use frontmatter with:

```yaml
---
name: install-repo
description: ...
---
```

## Supported Inputs

The skill should handle:

- plain repo names
- GitHub usernames/accounts
- `owner/repo`
- GitHub repo URLs
- natural-language descriptions
- branch/tag refs
- commit refs with repo context

Commit-only input should not be treated as globally searchable unless the conversation already identifies a repo.

## Search Behavior

Preferred search order:

1. `gh search repos <query>`
2. `gh repo list <owner>`
3. `gh api`
4. web search scoped to `github.com`

Natural-language description search should extract useful topic/function words and may try multiple keyword variants.

## Install Behavior

Install should inspect official sources before running commands:

- README
- docs site
- wiki
- releases
- package registry page
- `INSTALL`
- `CONTRIBUTING`
- package manifests
- Docker files

If multiple install options exist:

- run the official default if clear
- ask the user if no default is clear
- list unused official options in the final report

## Uninstall Behavior

Uninstall must be plan-first. Do not delete or uninstall immediately.

Inspect:

- local clone
- README/docs uninstall instructions
- uninstall scripts
- package manifests
- global package managers
- binaries
- hooks
- shell/profile edits
- services or scheduled tasks
- MCP entries
- AI tool config roots

Before destructive action, show the exact removal plan and require:

```text
confirm uninstall
```

## Public Documentation Requirements

Examples should use this project itself, such as:

```text
repo search Git-Install
repo install ojesusmp/Git-Install
repo uninstall Git-Install
```

Do not use unrelated third-party repos as primary examples in public docs.

## Release Checklist

Before pushing:

1. Validate the Codex skill.
2. Run a structural check on the Claude skill.
3. Review README examples for current behavior.
4. Confirm no credentials or local auth files are included.
5. Confirm public-facing docs credit Orlando Molina.
6. Commit with a clear decision-oriented message.
