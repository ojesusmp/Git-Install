# Contributing

Git-Install is created and maintained by Orlando Molina.

## Goals For Contributions

Contributions should keep the project simple:

- make repo search easier
- make repo install safer and clearer
- make repo uninstall conservative and reversible
- keep Codex and Claude skill behavior aligned
- keep examples based on Git-Install itself

## Before Changing The Skill

Check both skill variants:

```text
codex/install-repo/SKILL.md
claude/install-repo/SKILL.md
```

If behavior changes in one, update the other unless there is a tool-specific reason not to.

## Validation

Validate the Codex skill:

```powershell
python C:/Users/molin/.codex/skills/.system/skill-creator/scripts/quick_validate.py ./codex/install-repo
```

For Claude, perform a structural check:

- frontmatter exists
- `name: install-repo` exists
- `description:` exists
- search/install/uninstall workflows are present

## Safety Rules

Do not weaken uninstall safety. Any uninstall behavior must remain:

- plan-first
- confirmation-gated
- specific about files/config entries
- protective of Codex, Claude, OMX, OMC, credentials, hooks, skills, and prompts

## Documentation Rules

Public examples should use this project:

```text
repo search Git-Install
repo install ojesusmp/Git-Install
repo uninstall Git-Install
```

Avoid unrelated third-party repos in primary examples.
