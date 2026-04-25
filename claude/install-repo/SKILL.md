---
name: install-repo
description: Search, inspect, install, and uninstall GitHub repositories from a repo name, natural-language description, GitHub owner/repo pair, GitHub URL, username/account name, branch/tag/commit ref, or repo plus commit. Use when the user says "repo search", "repo install", "install repo", "repo uninstall", or asks Claude to find, evaluate, install, or safely remove a GitHub project. Supports numbered search results, installation from official README/docs/site instructions, a portable local installed-repos clone root, commit checkout, install-option selection, and conservative uninstall planning that avoids breaking Codex/Claude/AI tooling.
---

# install-repo — search, install, and uninstall GitHub repos

## When to invoke

- User types `repo search <query>`, `repo install <query>`, `install repo <query>`, or `repo uninstall <query>`.
- User provides a GitHub search phrase, natural-language description, account name, `owner/repo`, GitHub repo URL, branch/tag, or commit ref.
- User wants Claude to find matching GitHub repos, compare likely matches, install one, or safely remove one.

## Default install location

Use an `installed-repos` folder under the current project/workspace unless the user names another folder.

```text
<current-project>/installed-repos
```

Create it if it does not exist.

## Modes

- `repo search <query>`: Search only. Return the same repo information as install mode, then ask whether the user wants to install one and which number.
- `repo install <query>` / `install repo <query>`: Search or resolve, present numbered choices when needed, then install the selected repo from official instructions.
- `repo uninstall <query>`: Identify installed repo(s), inspect their install/uninstall docs and local effects, present a conservative removal plan, and require explicit confirmation before removing files or running uninstall commands.

## Input parsing

- `owner/repo`, such as `ojesusmp/Git-Install`: direct repo.
- GitHub repo URL: direct repo.
- Username/account only, such as `ojesusmp`: list public repos under that account.
- Repo/search name, such as `Git-Install`: search GitHub.
- Natural-language description, such as `repo search a skill that lets Codex or Claude install GitHub repos`: extract keywords, search GitHub, and rank by relevance.
- Branch, tag, or commit with repo, such as `ojesusmp/Git-Install@abc1234`, `ojesusmp/Git-Install commit abc1234`, or a GitHub commit URL: install that repo checked out at the requested ref.

A commit hash without repo context is not enough to search reliably across GitHub. Ask for the repository or account unless the surrounding conversation already identifies it.

## Search workflow

Prefer:

1. `gh search repos <query>` for name/search phrases.
2. `gh repo list <owner>` for account names.
3. GitHub API via `gh api`.
4. Web search scoped to `github.com` if GitHub CLI is unavailable.

For natural-language descriptions, search multiple keyword variants if needed. Include topic/function words, not filler.

Collect:

- `owner/repo`
- URL
- description
- primary language
- stars
- latest update date
- why it appears relevant when the query was a description

Use this format:

```text
I found these likely matches:
1. owner/repo - short description (language, stars, updated date) Relevant because: ...
2. owner/repo - short description (language, stars, updated date) Relevant because: ...

Reply with the number you want installed, or say "search more" with a refinement.
```

For `repo search`, stop after presenting results and ask whether to install. For `repo install`, install only after the user selects a number unless the input uniquely identifies a repo by `owner/repo` or URL.

## Install workflow

1. Inspect official instructions.
   - Read README first.
   - Then check official docs/site, wiki, releases, package registry pages, `INSTALL`, `CONTRIBUTING`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Dockerfile`, `docker-compose.yml`, and similar manifests.
   - Treat official repo docs as authoritative over third-party posts.
2. Clone safely.
   - Clone into `<current-project>/installed-repos/<repo-name>` by default.
   - If installing a non-default branch, tag, or commit, include the short ref in the folder name only when needed to avoid colliding with an existing checkout.
   - If the target folder exists, inspect it before changing anything.
3. Check out requested refs.
   - If a branch, tag, or commit was provided, fetch/checkout it before installing.
   - Record the resolved commit SHA.
4. Choose install option.
   - If there is one clear default/recommended install path, run it.
   - If multiple official options exist and one is clearly marked default/recommended/local development, run that option and list the other official commands in the final report.
   - If options are materially different and no default is clear, ask the user which option to run.
   - Avoid global installs unless official instructions require them or the user explicitly approves.
5. Verify with the recommended smoke test, version command, build command, test command, or example command.

Use this format when install options require a choice:

```text
The repo documents multiple install options:
1. Native/local - command(s)
2. Docker - command(s)
3. Global CLI - command(s)

Reply with the install option number to run.
```

## Uninstall workflow

Uninstall is high-risk because repos may install global packages, hooks, services, shell profile edits, MCP servers, skills, config files, or AI-tool integrations. Default to a plan-first workflow.

1. Identify the installed target.
   - Search the current project/workspace `installed-repos` folder first.
   - Match by folder name, git remote URL, package name, binary name, or user query.
   - If ambiguous, list candidates and ask for a number.
2. Inspect before removing.
   - Read README/docs for uninstall instructions.
   - Search the repo for uninstall/remove/cleanup docs and scripts.
   - Inspect manifests for installed package names and binaries.
   - Check likely global package managers only when relevant: npm, pip, cargo, go, pnpm, bun, winget, Docker.
   - Check whether the repo installed hooks, MCP servers, skills, prompts, shell/profile edits, services, scheduled tasks, PATH changes, or files under AI config roots.
3. Protect AI tooling and credentials.
   - Never delete or rewrite `~/.codex`, `~/.claude`, `.omx`, `.omc`, config files, hooks, skills, prompts, credentials, auth files, or settings wholesale.
   - Only remove entries that are clearly owned by the target repo and only after showing the exact path/key/command.
   - Prefer disable/comment/archive over deletion for shared config.
   - Back up config files before modifying them.
4. Present a removal plan before destructive work.
   - Separate safe commands from destructive commands.
   - Include exactly what folders, global packages, binaries, hooks, config entries, Docker resources, or services would be removed.
   - Ask for explicit confirmation before deleting folders or running uninstall commands.
5. Execute only after confirmation.
   - Run official uninstall commands first.
   - Remove the local clone last.
   - Verify binaries/config entries are gone and AI tools still start or report version normally.

Use this format:

```text
Uninstall plan for owner/repo:
1. Official uninstall command(s): ...
2. Local clone to remove: ...
3. Global package/binary cleanup: ...
4. Config/hooks entries to remove or archive: ...
5. Verification commands: ...

This will remove files or global packages. Reply "confirm uninstall" to proceed.
```

## Final response

For search, report the query, result list, suggested best match if clear, and prompt to install by number.

For install, report selected repo URL, install folder, requested ref/resolved SHA, install option, commands run, verification result, alternate official options, and warnings.

For uninstall, report target, official uninstall instructions found, commands run, files/config entries removed or archived, verification result, and anything intentionally left in place to protect AI tooling.
