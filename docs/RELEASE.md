# Release Process

Manual pre-flight checklist before tagging a release.

## One-time setup

1. Create npm account at https://www.npmjs.com/signup if you don't have one.
2. Run `npm login` locally and authenticate.
3. Verify the `@ojesusmp` scope is yours: `npm access list packages @ojesusmp` (returns empty if no packages exist yet — that's fine).
4. Generate an npm automation token:
   - https://www.npmjs.com/settings/<your-username>/tokens
   - Type: **Automation** (bypasses 2FA for CI)
   - Scope: read + publish
5. Add the token as a GitHub repo secret named `NPM_TOKEN`:
   - https://github.com/ojesusmp/Git-Install/settings/secrets/actions
   - New repository secret → name `NPM_TOKEN`, value `<token>`

## Per-release

1. Update `CHANGELOG.md` with the new version section.
2. Bump version: `npm version patch | minor | major` — this updates `package.json` and creates a git tag.
3. Push: `git push origin main && git push origin --tags`
4. The `Publish` GitHub Actions workflow runs on the new tag:
   - Pre-release (version contains `-`, e.g. `1.0.0-rc.1`) → `npm publish --tag next`
   - Stable (no `-`) → `npm publish --tag latest`
5. Verify: `npm view @ojesusmp/git-install dist-tags` shows the new version under the right tag.
6. Smoke test: `npx @ojesusmp/git-install --version` from a clean shell on each OS (Win/Mac/Linux).

## Rollback

If a release breaks something:

1. **Within 72 hours of publish**: `npm unpublish @ojesusmp/git-install@<version>`
2. **After 72 hours**: `npm deprecate @ojesusmp/git-install@<version> "<message>"` and publish a fixed version.
3. Update `dist-tags` if needed: `npm dist-tag add @ojesusmp/git-install@<good-version> latest`
