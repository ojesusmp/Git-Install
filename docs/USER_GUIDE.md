# User Guide

## Overview

`git-install` provides three operational modes:

| Mode      | Command                                    | Purpose                       |
| --------- | ------------------------------------------ | ----------------------------- |
| Search    | `git-install repo search <query>`          | Find repositories on GitHub   |
| Install   | `git-install repo install <query>[@<ref>]` | Clone and record a repository |
| Uninstall | `git-install repo uninstall <name>`        | Remove a recorded repository  |

### TTY confirmation contract

Install and uninstall are destructive operations. Both require an interactive terminal and an exact confirmation string before proceeding:

- Install: type `confirm`
- Uninstall: type `confirm uninstall`

Any other input cancels the operation with exit code 3.

### Exit codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 0    | Success                              |
| 1    | General error                        |
| 2    | Safety refusal (protected directory) |
| 3    | User cancelled                       |
| 4    | Missing prerequisite                 |

---

## `git-install setup`

Copies skill files from the npm package into your AI tool's config directory.

```sh
git-install setup --claude     # writes to ~/.claude/skills/install-repo/
git-install setup --codex      # writes to ~/.codex/skills/install-repo/
git-install setup --both       # writes to both
```

Setup checks that Node.js >= 20 is present and reports whether `gh` is on PATH. It prints each file written and a total count.

---

## `git-install repo search <query>`

Searches GitHub and prints a numbered list of results.

### Query forms

| Form             | Example                                          |
| ---------------- | ------------------------------------------------ |
| `owner/repo`     | `ojesusmp/git-install`                           |
| GitHub URL       | `https://github.com/ojesusmp/git-install`        |
| Natural language | `"skill that installs GitHub repos into Claude"` |
| Owner name       | `ojesusmp`                                       |

### Example

```sh
git-install repo search "owner/repo"
git-install repo search "a CLI for installing GitHub repos"
```

### Output format

```
1. owner/repo-name - Short description (TypeScript, 42 stars, updated 2025-03-10)
   URL: https://github.com/owner/repo-name
```

After results are displayed, follow up with the number of the repo you want to install, or refine your search.

---

## `git-install repo install <query>[@<ref>]`

Finds, confirms, clones, and records a repository.

### Full install flow

1. Parse query — if it matches `owner/repo` or a GitHub URL, resolve directly; otherwise run a search
2. If search returns multiple results, display a selection menu
3. Resolve the ref to a concrete SHA
4. Display the install plan
5. Prompt: type `confirm` to proceed
6. Clone with `git -c core.hooksPath=/dev/null clone` (git hooks neutralized)
7. Verify the checked-out SHA matches the resolved SHA
8. Write a record to `<data-dir>/installs.json`

### Query forms

```sh
git-install repo install owner/repo
git-install repo install owner/repo@main           # mutable branch — warns
git-install repo install owner/repo@v2.0.0         # mutable tag — warns
git-install repo install owner/repo@abc1234def     # SHA pin — immutable, no warning
git-install repo install https://github.com/owner/repo
```

### SHA pinning

Passing a 7–40 hex character ref treats the ref as an immutable SHA. No mutable-ref warning is issued and the ref is used directly without network resolution.

Passing a branch or tag name resolves to the current SHA but warns that the ref is mutable and may point to a different commit in the future.

### Install location

Repositories are cloned to:

```
<cwd>/installed-repos/<repo-name>/
```

The working directory is where you run `git-install`, not the CLI installation location.

### `--force`

Clears a stale lockfile from a previous interrupted run:

```sh
git-install repo install owner/repo --force
```

---

## `git-install repo uninstall <name>`

Looks up a recorded installation, displays the removal plan, and removes it after confirmation.

### Name forms

The name argument matches against:

- `owner/repo` (full name)
- `repo` (short name, the part after `/`)
- The basename of the recorded install path

### Uninstall flow

1. Load install records from `<data-dir>/installs.json`
2. Find records matching `<name>`
3. If multiple matches, display a selection menu
4. Display the uninstall plan (repo, install path, recorded SHA, install timestamp)
5. Prompt: type `confirm uninstall` to proceed
6. Remove the local clone directory
7. Remove the record from `installs.json`

### Example

```sh
git-install repo uninstall git-install
```

The plan output looks like:

```
Uninstall plan:
  Repository:    owner/repo-name
  Install path:  /home/user/project/installed-repos/repo-name
  Resolved SHA:  abc1234def...
  Installed at:  2025-03-10T14:22:00.000Z

This will permanently delete the local clone at the path above.

Type "confirm uninstall" to proceed:
```

---

## Environment variables

| Variable                       | Effect                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `GIT_INSTALL_NONINTERACTIVE=1` | Skip TTY check and auto-confirm all prompts. Logs a `WARN` line for each auto-confirmed prompt. Use in CI or scripting. |
| `XDG_DATA_HOME`                | Linux only — overrides the base for the data directory. Default: `~/.local/share/git-install/`                          |
| `LOCALAPPDATA`                 | Windows only — overrides the base for the data directory. Default: `%LOCALAPPDATA%\git-install\`                        |

---

## Install record location

Install records are stored in a JSON file at:

| Platform | Path                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------ |
| Linux    | `$XDG_DATA_HOME/git-install/installs.json` (default: `~/.local/share/git-install/installs.json`) |
| macOS    | `~/Library/Application Support/git-install/installs.json`                                        |
| Windows  | `%LOCALAPPDATA%\git-install\installs.json`                                                       |

The file uses `schemaVersion: 1`. Each record contains `repo`, `ref`, `resolvedSha`, `installPath`, and `timestamp`.

Example:

```json
{
  "schemaVersion": 1,
  "records": [
    {
      "repo": "owner/repo-name",
      "ref": "v2.0.0",
      "resolvedSha": "abc1234def5678901234567890abcdef12345678",
      "installPath": "/home/user/project/installed-repos/repo-name",
      "timestamp": "2025-03-10T14:22:00.000Z"
    }
  ]
}
```
