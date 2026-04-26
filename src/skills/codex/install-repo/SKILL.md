---
name: install-repo
description: Search, install, and uninstall GitHub repositories from owner/repo, URL, search query, or commit ref using the @ojesusmp/git-install CLI.
---

# install-repo — search, install, and uninstall GitHub repos

## When to invoke

Trigger phrases:

- `repo search <query>`
- `repo install <query>[@<ref>]`
- `install repo <query>`
- `repo uninstall <query>`

Also invoke when the user asks Codex to find, install, or remove a GitHub project by name, URL, owner/repo, username, natural-language description, or commit ref.

## Prerequisites

- Node >= 20
- git
- gh CLI (optional — used for faster search; falls back to GitHub REST API)

Run setup once before first use:

```sh
npx @ojesusmp/git-install setup --codex
```

## Modes

**search** — find matching repos, present a numbered list, ask which to install.

```
repo search <query>
```

**install** — resolve, clone, and install a repo from official docs.

```
repo install <query>[@<ref>]
install repo <query>
```

**uninstall** — inspect, plan, confirm, then remove an installed repo.

```
repo uninstall <name>
```

## Input parsing

| Form               | Example                                          |
| ------------------ | ------------------------------------------------ |
| `owner/repo`       | `ojesusmp/Git-Install`                           |
| GitHub URL         | `https://github.com/ojesusmp/Git-Install`        |
| Search query       | `a skill that lets Codex install GitHub repos`   |
| `owner/repo@<ref>` | `ojesusmp/Git-Install@abc1234`                   |
| Username only      | `ojesusmp` — lists public repos for that account |

A bare commit hash without repo context is not sufficient. Ask for the repository unless it is already established in the conversation.

## Search workflow

```sh
npx @ojesusmp/git-install repo search "<query>"
```

If gh CLI is available, it is used automatically. Otherwise the CLI falls back to the GitHub REST API.

Present results as a numbered list:

```
I found these likely matches:
1. owner/repo — description (language, ★ stars, updated date)
2. owner/repo — description (language, ★ stars, updated date)

Reply with the number to install, or say "search more" with a refinement.
```

For `repo search`: stop after presenting results and ask whether to install.
For `repo install`: proceed to install after the user selects a number, or immediately when input is an unambiguous `owner/repo` or URL.

## Install workflow

```sh
npx @ojesusmp/git-install repo install <query>[@<ref>]
```

Steps the CLI performs:

1. Resolve the repo (search or direct lookup).
2. Clone into `<current-project>/installed-repos/<repo-name>` by default.
3. Check out the requested branch, tag, or commit if a ref was provided. Record the resolved SHA.
4. Read the README and official docs to select the install option.
5. Run the recommended install commands.
6. Run the verification smoke test.

**TTY confirmation required.** The CLI prompts before cloning. To skip:

```sh
GIT_INSTALL_NONINTERACTIVE=1 npx @ojesusmp/git-install repo install <query>
```

Default install location:

```
<current-project>/installed-repos/<repo-name>
```

## Uninstall workflow

```sh
npx @ojesusmp/git-install repo uninstall <name>
```

Steps:

1. Look up the install record in `<current-project>/installed-repos/`.
2. Read README/docs for official uninstall instructions.
3. Present a removal plan (folders, global packages, config entries to remove).
4. Wait for the literal string `confirm uninstall` before executing.
5. Run official uninstall commands, then remove the local clone.
6. Verify binaries and AI tools are intact.

Confirmation prompt format:

```
Uninstall plan for owner/repo:
1. Official uninstall command(s): ...
2. Local clone to remove: ...
3. Global package/binary cleanup: ...
4. Config/hooks entries to remove or archive: ...
5. Verification commands: ...

This will remove files or global packages. Reply "confirm uninstall" to proceed.
```

## Safety boundaries

Protected directories — the CLI refuses to use these as install targets:

- `~/.claude`
- `~/.codex`
- `~/.ssh`
- `~/.gnupg`
- `.omc/`
- `.omx/`
- Any path containing `credentials` or `auth`

The CLI does **not** execute README content. Codex must not infer destructive shell commands from repo documentation and run them without showing the user the exact commands first.

## Final response format

**After search:** state the query used, the numbered result list, the suggested best match if clear, and a prompt to install by number.

**After install:** state the repo URL, install folder, ref and resolved SHA (if requested), install option used, commands run, verification result, and any warnings.

**After uninstall:** state the target, official uninstall instructions found, commands run, files and config entries removed or archived, verification result, and anything intentionally left in place to protect AI tooling.
