# User Guide

Git-Install was created by Orlando Molina to make GitHub repo search, install, and uninstall workflows easier from Claude Code or Codex.

## Install The Skill

Start with the install guide:

[INSTALL.md](INSTALL.md)

Short version:

- Codex loads skills from `~/.codex/skills`.
- Claude loads skills from `~/.claude/skills`.
- Installing this skill means copying the correct `install-repo` folder into the correct skill directory.

The scripts in `scripts/` only automate that copy step.

## Search For Repos

Use `repo search` when you only want to look.

Examples using this project:

```text
repo search Git-Install
repo search a skill that lets Codex or Claude install GitHub repos
repo search ojesusmp
```

The assistant should return a numbered list with repository names, descriptions, language, stars, update date, and why each result matches.

To install one, reply with the number.

## Install Repos

Use `repo install` or `install repo` when your goal is to install.

Examples using this project:

```text
repo install Git-Install
repo install ojesusmp/Git-Install
repo install https://github.com/ojesusmp/Git-Install
repo install ojesusmp/Git-Install@main
```

If the input matches multiple repositories, the assistant should list them and wait for your number.

If the input uniquely identifies one repo, the assistant can inspect and install it directly.

## Install Options

Some repos have more than one install method, such as npm, Docker, source build, plugin marketplace, or manual copy.

The assistant should:

- use the official default if one is clearly documented
- show other official options in the final report
- ask you to choose if the options are different and no default is clear

## Uninstall Repos

Use `repo uninstall` when you want to remove a repo or undo an install.

Example using this project:

```text
repo uninstall Git-Install
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
