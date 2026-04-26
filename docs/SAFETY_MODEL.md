# Safety Model

## Goals

Safety primitives in `git-install` are code-enforced, not LLM-enforced. Rules implemented in `src/safety/` apply unconditionally regardless of what an AI assistant is instructed to do. This section documents what is enforced, how it is enforced, and where enforcement ends.

---

## Code-Enforced Primitives

### Protected directories

`src/safety/protected-dirs.ts` defines a hardcoded allowlist of directories the CLI refuses to write into:

```
~/.codex
~/.claude
~/.ssh
~/.gnupg
~/.aws
~/.config/gh
~/.netrc
.omx         (relative to cwd)
.omc         (relative to cwd)
```

Files matching `*.env` are also protected regardless of directory.

The `isProtected(targetPath)` function is called before every file write and clone target selection. On Windows, comparisons are case-insensitive. Path-traversal attempts (e.g. `../../../.ssh`) are blocked because paths are resolved to absolute form via `path.resolve()` before comparison.

Any write that would land inside a protected directory throws with exit code 2 (safety refusal).

### Confirmation gates

Install and uninstall both require a live interactive terminal (TTY) and an exact confirmation string before any destructive action:

- Install: prompts `Type "confirm" to proceed:` — only the literal string `confirm` proceeds
- Uninstall: prompts `Type "confirm uninstall" to proceed:` — only the literal string `confirm uninstall` proceeds

The check is implemented in `src/lib/prompt.ts`. `assertTTY()` throws if `process.stdin.isTTY` is falsy. The confirmation comparison is strict equality, not substring match.

Setting `GIT_INSTALL_NONINTERACTIVE=1` bypasses the TTY check and auto-confirms. The bypass logs a `WARN` line for each auto-confirmed prompt so non-interactive runs are auditable.

### Supply chain

Every install resolves the target ref to a concrete SHA before cloning. The resolution order is:

1. If the ref is already a 7–40 hex SHA, use it directly (immutable, no network call)
2. `gh api repos/{owner}/{repo}/commits/{ref}` (requires gh CLI)
3. `git ls-remote https://github.com/{owner}/{repo}.git {ref}` (fallback)
4. GitHub REST API `GET /repos/{owner}/{repo}/commits/{ref}` (fallback)

If the ref is a branch or tag name (mutable), a warning is displayed in the install plan before the confirmation prompt. The resolved SHA is persisted in the install record (`installs.json`), so the exact commit that was installed is always known.

Clones use the resolved SHA for checkout. After cloning, `git rev-parse HEAD` is run and compared to the expected SHA. A mismatch throws an error and no record is written.

### Atomicity

`src/safety/atomicity.ts` implements a backup-write-rename pattern for all file writes:

1. If the target file exists, rename it to `<target>.backup-{timestamp}-{pid}`
2. Write new content to `<target>.tmp`
3. Rename `.tmp` to the target (atomic on same filesystem)
4. Delete the backup on success; restore it on failure

`recoverFromInterrupt()` scans a directory for orphaned `.tmp` and `.backup-*` files on startup and restores consistent state before any operation begins.

### Concurrency

`src/lib/lockfile.ts` uses a PID-based lockfile stored in the data directory. Acquisition uses the `wx` (exclusive create) flag so only one `git-install` process can run at a time.

If a lockfile exists from a dead process (stale lock), the CLI reports the stale PID and instructs the user to re-run with `--force`. The `--force` flag removes the stale lock and reacquires.

### Git hook neutralization

All `git clone` and `git checkout` calls pass `-c core.hooksPath=/dev/null`:

```sh
git -c core.hooksPath=/dev/null clone <url> <target>
```

This prevents post-checkout and other hooks bundled in a cloned repository from executing during the install process.

---

## Limitations

These limitations are not bugs. They are documented boundaries of what the CLI enforces.

**The protected-directory guard only covers the CLI's own file operations.** When an AI assistant reads a cloned repository's README, scripts, or documentation, nothing in this CLI prevents the AI from interpreting that content as instructions and executing arbitrary shell commands. A malicious repository could include README prose that instructs an AI to write files to protected paths. The CLI's `isProtected()` guard does not intercept those subsequent commands.

**The AI assistant remains responsible for not following adversarial instructions in repo content.** This is a property of the AI tool and its system prompt, not of this CLI.

**SHA pinning prevents silent ref drift but does not detect a compromised upstream.** If a GitHub repository's history is rewritten after an install, the recorded SHA still reflects what was installed. The CLI does not re-verify SHAs on subsequent runs. The CLI does not validate SLSA provenance, Sigstore signatures, or any cryptographic artifact attestation beyond GitHub's own HTTPS and TLS.

**README content is data, not code.** Users who install adversarial repositories via this CLI assume the same risk as running `git clone` directly and then executing the repo's scripts.

---

## Threat Model

| Threat                                         | Mitigation                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Curated repo install (normal case)             | SHA pinning, mutable-ref warning, TTY confirmation                                                          |
| Random public repo install                     | Same as above; hook neutralization prevents post-checkout execution                                         |
| Compromised upstream (ref drift after install) | Mitigated for the installed version via SHA pinning; does not protect future installs                       |
| CLI writes to sensitive paths                  | Code-enforced `isProtected()` guard, exit code 2 on violation                                               |
| Concurrent CLI invocations                     | PID-based lockfile                                                                                          |
| Interrupted run leaving partial state          | atomicWrite + recoverFromInterrupt                                                                          |
| Local AI jailbreak targeting protected dirs    | Code-enforcement means CLI refuses regardless of AI instruction; AI exec after install is outside CLI scope |

---

## Reporting Security Issues

Open a GitHub Issue for non-sensitive concerns. For security vulnerabilities, please follow responsible disclosure: describe the issue privately before public disclosure and allow reasonable time for a fix before publishing details.
