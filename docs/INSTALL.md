# Installation Guide

Git-Install was created by Orlando Molina.

## How Installation Works

There is no universal package-manager command that installs both Codex and Claude skills for every user environment.

The correct install method is to copy the skill folder into the skill directory used by your AI tool:

- Codex: `~/.codex/skills/install-repo`
- Claude: `~/.claude/skills/install-repo`

The helper scripts in this repo only automate that copy. They are optional.

## Step 1: Clone This Repository

When this repo is public:

```powershell
git clone https://github.com/ojesusmp/Git-Install.git
cd Git-Install
```

While it is private, GitHub authentication is required before cloning.

## Install For Codex

PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
Copy-Item -Recurse -Force ".\codex\install-repo" "$env:USERPROFILE\.codex\skills\"
```

Equivalent manual result:

```text
%USERPROFILE%\.codex\skills\install-repo\SKILL.md
%USERPROFILE%\.codex\skills\install-repo\agents\openai.yaml
```

Optional helper:

```powershell
.\scripts\install-codex.ps1
```

## Install For Claude

PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
Copy-Item -Recurse -Force ".\claude\install-repo" "$env:USERPROFILE\.claude\skills\"
```

Equivalent manual result:

```text
%USERPROFILE%\.claude\skills\install-repo\SKILL.md
```

Optional helper:

```powershell
.\scripts\install-claude.ps1
```

## macOS/Linux

Codex:

```bash
mkdir -p ~/.codex/skills
cp -R ./codex/install-repo ~/.codex/skills/install-repo
```

Claude:

```bash
mkdir -p ~/.claude/skills
cp -R ./claude/install-repo ~/.claude/skills/install-repo
```

## Verify

Codex validation, from the cloned repo:

```powershell
python C:/Users/molin/.codex/skills/.system/skill-creator/scripts/quick_validate.py ./codex/install-repo
```

Functional check inside Codex or Claude:

```text
repo search Git-Install
```

The assistant should recognize the skill and return GitHub search results.

## Update

Pull the latest repo changes, then repeat the copy command:

```powershell
git pull
.\scripts\install-codex.ps1
.\scripts\install-claude.ps1
```

Running the copy again replaces the installed skill files with the current repo version.
