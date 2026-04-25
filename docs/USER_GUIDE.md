# User Guide

This guide explains how to use Git-Install in plain language.

Created by Orlando Molina.

## Install The Skill

For Codex:

```powershell
.\scripts\install-codex.ps1
```

For Claude:

```powershell
.\scripts\install-claude.ps1
```

Restart or reload your AI tool if it does not see the skill immediately.

## Search For Repos

Use `repo search` when you only want to look.

Examples:

```text
repo search caveman
repo search JuliusBrussee
repo search a tool that compresses LLM prompts
repo search github cli dashboard for Claude Code sessions
```

The assistant should return a numbered list with repository names, descriptions, language, stars, update date, and why each result matches.

To install one, reply with the number.

## Install Repos

Use `repo install` or `install repo` when your goal is to install.

Examples:

```text
repo install caveman
install repo oh my codex
repo install JuliusBrussee/caveman
repo install https://github.com/JuliusBrussee/caveman
repo install JuliusBrussee/caveman@abc1234
```

If the input matches multiple repositories, the assistant should list them and wait for your number.

If the input uniquely identifies one repo, the assistant can inspect and install it directly.

## Install Options

Some repos have more than one install method, such as npm, Docker, source build, or plugin marketplace.

The assistant should:

- use the official default if one is clearly documented
- show other official options in the final report
- ask you to choose if the options are different and no default is clear

## Uninstall Repos

Use `repo uninstall` when you want to remove a repo or undo an install.

Example:

```text
repo uninstall oh-my-codex
```

The assistant should not remove anything immediately. It should first show an uninstall plan with:

- the local clone folder
- official uninstall commands, if found
- global packages or binaries to remove
- config or hook entries to remove or archive
- verification commands

Only after you reply with `confirm uninstall` should it remove files or run uninstall commands.

## What To Expect In Final Reports

For installs, the final report should include:

- repo URL
- install folder
- commands run
- selected install option
- resolved commit SHA when relevant
- verification result
- warnings or platform caveats

For uninstalls, it should include:

- target removed
- commands run
- files/config entries removed or archived
- verification result
- anything intentionally left in place for safety
