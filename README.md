# BQ-Backend-Packages

This repository contains shared backend packages that can be built and published individually to npm.

## Prerequisites

Before publishing any package, make sure:

1. Node.js and npm are installed.
2. You are in the repository root:

```powershell
cd C:\Users\nages\Desktop\BQ\BQ-Backend-Packages
```

3. The package source changes are complete.
4. You have npm publish access for the package.

## Publish Script

All publish-related flows are handled by:

```powershell
.\scripts\publish-package.ps1
```

This script shows all publishable packages, asks you to choose one, and then runs the action you selected.

## Available Actions

The script supports these actions:

- `check-login`
- `login`
- `build`
- `pack-preview`
- `publish`
- `republish`

## Step-By-Step Publish Flow

This is the recommended process for publishing any shared package.

### 1. Check npm login

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish-package.ps1 -Action check-login
```

If you are already logged in, npm will show your username.

### 2. Login to npm if needed

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish-package.ps1 -Action login
```

Complete the npm login flow in the terminal.

### 3. Build the selected package

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish-package.ps1 -Action build
```

The script will display a numbered package list.
Enter the number of the package you want to build.

### 4. Preview the package before publish

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish-package.ps1 -Action pack-preview
```

This builds the package and runs `npm pack --dry-run` so you can review what will be included in the npm package.

### 5. Publish the package

If the package version is new and already updated in `package.json`, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish-package.ps1 -Action publish
```

### 6. Recommended: republish with version bump in one flow

If you want the script to update the version and then publish, use:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\publish-package.ps1" -Action republish
```

After selecting the package, the script will ask for the bump type:

- `patch`
- `minor`
- `major`
- `prerelease`

For small fixes, `patch` is usually the right choice.

## Republish Flow

In this repo, `republish` means:

- bump the selected package version
- rebuild the package
- publish the new version

Use:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\publish-package.ps1" -Action republish
```

## Recommended Flow For Shared Packages

For most packages, follow this order:

1. `check-login`
2. `login` if required
3. `build`
4. `pack-preview`
5. `republish`

## Example: Publish The Constants Package

To publish the constants package, run:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\publish-package.ps1" -Action republish
```

Then:

1. Select `@beautinique/be-constants` from the package list.
2. Choose the version bump type, usually `patch`.
3. Let the script build and publish the package.

## VS Code Tasks

The same flows are also available in VS Code tasks.

Open the command palette and run:

```text
Tasks: Run Task
```

Available tasks:

- `Check NPM Login`
- `Login To NPM`
- `Build Selected Package`
- `Preview Selected Package`
- `Publish Selected Package`
- `Republish Selected Package`

These tasks call the same PowerShell script internally.

## Notes

- The script works from the repository root and scans for publishable `package.json` files.
- It ignores `node_modules`.
- The current version bump flow uses `npm version <type> --no-git-tag-version`.
- Publishing is done with `npm publish --access public`.

## Troubleshooting

### PowerShell error: `GetRelativePath` method not found

The publish script has already been updated to work on older PowerShell versions where `[System.IO.Path]::GetRelativePath()` is not available.

### npm login error

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish-package.ps1 -Action login
```

### npm says version already exists

Use:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\publish-package.ps1" -Action republish
```
to bump the version and publish a new release.
