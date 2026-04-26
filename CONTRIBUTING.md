# Contributing

Be respectful. This project follows a basic code of conduct: treat other contributors as you would want to be treated.

## Dev Setup

```sh
git clone https://github.com/ojesusmp/git-install.git
cd git-install
npm install
```

Node.js >= 20 is required.

Run the full check suite before opening a PR:

```sh
npm run typecheck
npm test
npm run test:coverage
npm run lint
npm run format:check
```

## Branch Conventions

Create a feature branch off `main`:

```sh
git checkout -b feat/short-description
```

Do not commit directly to `main`.

## PR Requirements

All of the following must be true before a PR is merged:

- **CI passes** — typecheck, vitest (>= 80% coverage on `src/`), ESLint, Prettier all green on the 3-OS matrix (Windows, macOS, Linux)
- **Tests included** — new functionality must have corresponding tests
- **TDD for safety primitives** — any change to `src/safety/` must be accompanied by tests written before the implementation
- **No developer-machine paths** — no hardcoded usernames, no `C:/Users/<name>` absolute paths, no paths specific to a local environment anywhere in source or docs
- **CHANGELOG updated** — add an entry under the relevant version in `CHANGELOG.md`

## Commit Messages

Conventional commit format is encouraged:

```
feat: add --dry-run flag to repo install
fix: handle ENOENT when lockfile disappears between read and unlink
docs: update USER_GUIDE exit code table
test: add protected-dir path-traversal coverage
chore: upgrade vitest to 2.x
```

Format: `<type>(<optional scope>): <short description>`

## Issue Templates

When opening an issue, use the appropriate category:

- **Bug** — include the command you ran, the error output, your OS, and Node.js version
- **Feature request** — describe the use case, not just the solution
- **Security** — do not post vulnerability details in a public issue; follow the responsible disclosure note in [docs/SAFETY_MODEL.md](docs/SAFETY_MODEL.md) instead
