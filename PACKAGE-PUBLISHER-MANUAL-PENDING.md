# Package Publisher Manual Pending Tests

Date: 2026-06-29

## Verified Locally

- `npm test`: passed 12 automated tests covering version calculation, package version updates, validators, dependency sorting, and batch operation summary/error behavior.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed after allowing the sandbox-blocked esbuild child process.
- Changed-files Prettier check: passed.
- Read-only npm registry lookup: `@beautinique/shared-test` and `@beautinique/shared-test-2` both resolve to `1.1.0`.
- Package status flow: both workspace packages show as published, synced, and version `1.1.0`.
- Authentication state check: `npm whoami` returned `E401 Unauthorized`, so this environment is currently logged out.

## Fixed During Review

- Republish validation now rejects unpublished packages, invalid local/remote versions, same versions, and lower local versions before touching `package.json`.
- Metadata loading now reports invalid local package versions as expected validation errors instead of allowing inconsistent status behavior.
- `updatePackageVersion()` now preserves the existing JSON indentation and trailing newline style while updating the version.
- Added a root `npm test` script and targeted automated coverage for the package publisher.

## Not Tested Here

These cases need a real terminal session with npm credentials, registry access, or deliberate manual keyboard interruption.

### Authentication

- Login when already logged out.
- Login with valid credentials.
- Login with invalid credentials.
- Cancel login.
- Ctrl+C during login.
- Logout while logged in.
- Logout while already logged out.
- Cancel logout.
- Ctrl+C during logout.
- CLI starts while logged in and username is shown correctly.
- Full interactive CLI startup while logged out and Login option is shown.

### Real npm Publish

- Publish an unpublished package to the real npm registry.
- Cancel publish confirmation in the interactive prompt.
- Publish prerelease and confirm npm dist-tag behavior.
- Publish package with real dependencies.
- npm publish network failure.
- npm publish permission failure.
- npm publish OTP required.
- Multiple-package publish where the first succeeds and the second fails.
- Multiple-package publish where a middle package fails and remaining packages continue.
- Real publish-all with unpublished packages.
- Real publish-all with no unpublished packages.

### Real npm Republish

- Republish patch, minor, major, and custom version through the full interactive CLI.
- Cancel republish confirmation in the interactive prompt.
- Publish failure restores package version after real npm failure.
- Restore failure warning after a real file-system restore failure.
- Multiple-package republish patch/custom flows through prompts.
- Republish-all with real published packages.
- Republish-all with no published packages.

### Prompt and Keyboard UX

- Package selection prompt with one package.
- Package selection prompt with multiple packages.
- No package selected validation in the live checkbox prompt.
- Cancel package prompt.
- Ctrl+C during package prompt.
- Version selection prompt for patch, minor, major, and custom.
- Custom version prompt live validation.
- Confirmation prompt yes, no, and Ctrl+C.
- Exit from menu.
- Ctrl+C from menu.
- Repeat operations in one CLI session.

### npm Wrapper Against Real Registry

- `whoami()` while logged in.
- `whoami()` while logged out.
- `whoami()` when npm is unavailable.
- `getPackageInfo()` for existing package.
- `getPackageInfo()` for non-existing package.
- `getPackageInfo()` invalid npm response.
- `getPackageInfo()` invalid JSON.
- `getPackageInfo()` network failure.
- `publish()` stable version against npm.
- `publish()` prerelease against npm.
- `publish()` invalid prerelease against npm.

### File-System Cases Needing OS Setup

- Invalid path outside the workspace.
- Read-only `package.json`.
- Corrupted package.json through the full CLI flow.

### UX and Performance

- Colors visible in the actual terminal theme.
- Table alignment in narrow and wide terminals.
- Summary, error, success, and warning formatting in a real terminal.
- Long output readability in a real terminal.
- Performance with 10, 50, and 100 packages.
- Performance with a large dependency graph.
- Performance with large workspace names.

### Final Release

- README completeness review.
- CHANGELOG update review.
- Version bump decision.
- Actual publish successful.
