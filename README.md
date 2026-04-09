# BQ-Packages

## Publish Tasks

This repo includes VS Code tasks for publishing packages separately for backend and frontend.

### NPM Login Check

Before publishing, you can verify the active npm account:

1. Open the command palette with `Ctrl + Shift + P`
2. Run `Tasks: Run Task`
3. Select `NPM Login Check`
4. Confirm that the printed username is the correct npm account

If this task fails, run `npm login` in the terminal and try again.

### Backend Package Publish

1. Open the command palette with `Ctrl + Shift + P`
2. Run `Tasks: Run Task`
3. Select `Publish Backend Package`
4. Enter the backend package name or folder path
5. Press Enter

Examples:

- `bq-shared-constants`
- `bq-shared-zod-schemas`
- `shared\zod`

What this task does:

- finds the selected backend package
- bumps the patch version
- runs the package build script
- publishes the package to npm

### Frontend Package Publish

1. Open the command palette with `Ctrl + Shift + P`
2. Run `Tasks: Run Task`
3. Select `Publish Frontend Package`
4. Enter the frontend package name or folder path
5. Press Enter

Note:

- the frontend task will work only after `frontend/scripts/publish-package.js` is created
- if that script is missing, VS Code will show a clear error message
