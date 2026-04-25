# Safety Model

Git-Install is designed to be useful without damaging a user's AI tooling environment.

Created by Orlando Molina.

## Main Rule

Search and install can be direct after selection. Uninstall must be planned and confirmed.

## Protected Areas

The skill must never broadly delete or rewrite:

- `~/.codex`
- `~/.claude`
- `.omx`
- `.omc`
- credentials
- auth files
- settings files
- hooks
- prompts
- skills
- MCP server configuration
- shell profile files

Targeted edits are allowed only when the exact entry is clearly owned by the repo being removed and the user has confirmed the uninstall plan.

## Uninstall Planning Requirements

Before removal, inspect:

- official uninstall docs
- local clone contents
- package manifests
- package manager global installs
- binaries
- hooks
- services
- scheduled tasks
- Docker resources
- AI config roots

The uninstall plan must say:

- what commands will run
- what files or folders will be removed
- what config entries will be removed or archived
- what will be left in place and why
- how the result will be verified

## Confirmation Requirement

The assistant must ask for explicit confirmation before destructive work:

```text
confirm uninstall
```

## Verification Requirements

After install:

- run a version, build, test, smoke, or example command
- report if verification was partial

After uninstall:

- confirm removed binaries/packages are gone
- confirm local clone removal or archival
- confirm protected AI tools still start or report versions normally when relevant

## Preferred Config Handling

Prefer safe reversible actions:

- archive instead of delete
- comment/disable instead of remove
- back up before edits
- remove only clearly owned entries

Never modify shared config by broad string deletion.
