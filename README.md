# Beautinique Packages — Repository Document

## 1. Overview

**Repository Name:** `@beautinique/packages`  
**Version:** `1.0.0`  
**License:** MIT  
**Author:** Nageshwar Pawar  
**Repository:** [https://github.com/Nageshwar1997/BQ-Packages](https://github.com/Nageshwar1997/BQ-Packages)  
**Package Registry:** npm (scoped under `@beautinique`)  
**Current Branch:** `main`  
**Node.js Requirement:** `>=24`  
**npm Requirement:** `>=11`  
**Module Type:** ESM (`"type": "module"`)  

This is a **private** TypeScript monorepo that houses reusable packages for the Beautinique ecosystem. It provides tooling for **scaffolding new packages** and **publishing them to npm** via an interactive CLI.

---

## 2. Monorepo Structure (excluding `packages/`)

```
BQ-Packages/
├── .git/
├── .gitignore
├── .prettierignore
├── .prettierrc
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md
├── package.json
├── package-lock.json
├── node_modules/
├── configs/
│   ├── eslint/
│   │   ├── eslint.base.config.mjs
│   │   ├── eslint.backend.config.mjs
│   │   ├── eslint.frontend.config.mjs
│   │   └── eslint.shared.config.mjs
│   ├── tsconfig/
│   │   ├── tsconfig.base.json
│   │   ├── tsconfig.backend.json
│   │   ├── tsconfig.frontend.json
│   │   └── tsconfig.shared.json
│   └── tsup/
│       ├── tsup.base.config.ts
│       ├── tsup.backend.config.ts
│       ├── tsup.frontend.config.ts
│       └── tsup.shared.config.ts
├── scripts/
│   ├── create-package/
│   │   ├── constants.mjs
│   │   ├── index.mjs
│   │   ├── metadata.mjs
│   │   ├── package.mjs
│   │   ├── prompts.mjs
│   │   ├── template.mjs
│   │   ├── utils.mjs
│   │   ├── validators.mjs
│   │   └── generators/
│   │       ├── copy-template.mjs
│   │       ├── eslint.mjs
│   │       ├── generate-package.mjs
│   │       ├── package-json.mjs
│   │       ├── readme.mjs
│   │       ├── tsconfig.mjs
│   │       └── tsup.mjs
│   ├── sync-allow-scripts/
│   │   └── index.mjs
│   └── clean.mjs
│   └── package-publisher/
│       ├── index.mjs
│       ├── allow-scripts.mjs
│       ├── auth.mjs
│       ├── batch-operation.mjs
│       ├── color.mjs
│       ├── constants.mjs
│       ├── dependency-sort.mjs
│       ├── errors.mjs
│       ├── metadata.mjs
│       ├── npm.mjs
│       ├── package.mjs
│       ├── package-selection.mjs
│       ├── package-status.mjs
│       ├── paths.mjs
│       ├── prompts.mjs
│       ├── publish.mjs
│       ├── reporter.mjs
│       ├── republish.mjs
│       ├── dependency-update.mjs
│       ├── table.mjs
│       ├── types.mjs
│       ├── utils.mjs
│       ├── validators.mjs
│       └── version.mjs
└── templates/
    ├── backend/
    │   └── template.json
    ├── base/
    │   └── src/
    │       └── index.ts
    ├── frontend/
    │   └── template.json
    └── shared/
        └── template.json
```

---

## 3. Package.json & Scripts

### Root `package.json`

| Field        | Value                   |
| ------------ | ----------------------- |
| `name`       | `@beautinique/packages` |
| `private`    | `true`                  |
| `workspaces` | `packages/*/*`          |
| `type`       | `module`                |

### Available Scripts

| Script         | Command                                      | Description                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| `build`        | `node ./scripts/build-order/index.mjs`       | Build all workspace packages in dependency order |
| `lint`         | `npm run lint --workspaces`                  | Lint all workspace packages                 |
| `lint:fix`     | `npm run lint:fix --workspaces`              | Lint and fix all workspace packages         |
| `typecheck`    | `npm run typecheck --workspaces`             | Type-check all workspace packages           |
| `format`       | `prettier . --write`                         | Format all files with Prettier              |
| `format:check` | `prettier . --check`                         | Check formatting with Prettier              |
| `clean`        | `node ./scripts/clean.mjs`                   | Clean build artifacts (not yet implemented) |
| `create`       | `node ./scripts/create-package/index.mjs`    | Launch interactive package generator        |
| `publish`      | `node ./scripts/package-publisher/index.mjs` | Launch interactive package publisher        |
| `clean`        | `node ./scripts/clean.mjs`                   | Launch interactive package publisher        |
| `republish`    | `node ./scripts/republish/index.mjs`         | Republish packages (also updates their dependencies, see 6.3.15) |
| `update-deps`  | `node ./scripts/update-dependencies/index.mjs` | Update the dependencies of **every package and the root** to the latest version (see below) |
| `sync-allow-scripts` | `node ./scripts/sync-allow-scripts/index.mjs` | Move the `allowScripts` approval of a package to its new installed version (see "Install scripts" below) |
| `test:scripts` | `node --test "scripts/**/*.test.mjs"`        | Tests of the scripts themselves (Node's own test runner) |

#### `npm run update-deps`

Moves the dependencies of every `package.json` of the repository (the root and each package) to the latest version on npm, by the same rules as a republish (see 6.3.15): `typescript` (`DEPENDENCY_UPDATE_EXCLUDED_PACKAGES`), exact versions and the peer ranges of other people's packages are left as they are; a dependency is never moved to an older version.

It shows the plan first (a major step is in yellow), asks, writes the `package.json` files in the style they had, and runs `npm install`. If something fails after the first file was written, the `package.json` files and `package-lock.json` go back as they were. Then check the result with `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build`.

```bash
npm run update-deps                   # plan, ask, write, npm install
npm run update-deps -- --dry-run      # only the plan, nothing is written
npm run update-deps -- --yes          # do not ask
npm run update-deps -- --no-install   # write the files, do not run npm install
```

Code: `scripts/update-dependencies/` (the rules are the ones of `scripts/republish/dependency-update.mjs`).

#### Install scripts (`allowScripts`)

npm 12 does not run the install script of a dependency (`canvas`, `esbuild`, `msgpackr-extract`) unless the root `package.json` allows it in `allowScripts`, and the key is pinned to an exact version (`"esbuild@0.28.2": true`). So every new version of such a package used to be blocked until the key was changed by hand.

Now every `npm install` of the scripts (`update-deps`, `republish`, `publish`) is followed by a check (`scripts/common/allow-scripts.mjs`, wired in `installWorkspaceDependencies`): it asks `npm install-scripts ls --json` what was blocked and

- **a package that was approved before** (another version of it is `true` in `allowScripts`, none is `false`): the approval moves to the installed version (`npm install-scripts approve <name>`, which also drops the old key) and its script is run (`npm rebuild <name>`). It says so in one line, e.g. `the approval of "esbuild" moved from esbuild@0.27.7 to esbuild@0.28.2`;
- **a package never approved**: nothing is approved. It is named, with the command to approve it (`npm install-scripts approve <name>`). A script that is new to the project is a decision for a person;
- if the check itself cannot run, it warns and the install goes on.

A plain `npm install` / `npm update` run by hand is not followed by this check. For that there is a command that does the same check on its own:

```bash
npm run sync-allow-scripts             # check what npm blocked, move the approvals, run the scripts
npm run sync-allow-scripts -- --dry-run # only say what it would do, change nothing
npm run sync-allow-scripts -- --help
```

When to use it: after you ran `npm install` or `npm update` yourself and npm printed `npm warn install-scripts ... had install scripts blocked`. Run `npm run sync-allow-scripts`; the output is one of

| Output | Meaning |
| --- | --- |
| `No install script is waiting` | Nothing is blocked: `allowScripts` covers everything npm installed. |
| `the approval of "esbuild" moved from esbuild@0.27.7 to esbuild@0.28.2` | The key in the root `package.json` is changed and the script was run. Commit the `package.json` change. |
| `npm blocked the install script of sharp@1.0.0, which was never approved here` | It is new to the project, so it is not approved for you. Look at what it does, then `npm install-scripts approve sharp` (or `npm install-scripts deny sharp`). |

It needs npm 12 (the `install-scripts` command; tried with npm 12.2.0 and Node 24.21.0). With an older npm it stops with npm's own error, and the checks that run after the scripts' `npm install` only warn. `--dry-run` is done by this command, not by `npm install-scripts approve --dry-run`, which in npm 12.2 still writes the `package.json`. Code: `scripts/sync-allow-scripts/` (the entry) and `scripts/common/allow-scripts.mjs` (the logic).

### Key DevDependencies

| Dependency          | Version   | Purpose                      |
| ------------------- | --------- | ---------------------------- |
| `typescript`        | `^6.0.3`  | TypeScript compiler          |
| `tsup`              | `^9.0.0`  | Build tool (esbuild wrapper) |
| `eslint`            | `^10.13.0` | Linting                     |
| `typescript-eslint` | `^8.71.2` | TypeScript ESLint rules      |
| `prettier`          | `^3.9.10` | Code formatting              |
| `inquirer`          | `^14.2.3` | Interactive CLI prompts      |
| `semver`            | `^7.8.5`  | Semantic versioning          |
| `picocolors`        | `^1.1.1`  | Terminal colors              |

---

## 4. Shared Configurations (`configs/`)

All workspace packages **extend** from these shared configs instead of duplicating them.

### 4.1 ESLint Configs

| File                         | Extends From    | Specialization                                                                    |
| ---------------------------- | --------------- | --------------------------------------------------------------------------------- |
| `eslint.base.config.mjs`     | — (root)        | Base rules: TS strict, import sorting, no-explicit-any, no-console, eqeqeq, curly |
| `eslint.shared.config.mjs`   | `eslint.base`   | Adds type-checked rules for async/promise handling                                |
| `eslint.backend.config.mjs`  | `eslint.shared` | Node.js-specific type-checked rules                                               |
| `eslint.frontend.config.mjs` | `eslint.shared` | React-specific (`tsx`) with relaxed `no-misused-promises`                         |

**Ignored paths:** `node_modules`, `dist`, `dist-ssr`, `coverage`, `*.d.ts`, `*.min.js`, `*.tsbuildinfo`.

### 4.2 TypeScript Configs

| File                     | Extends From    | Key Additions                                                            |
| ------------------------ | --------------- | ------------------------------------------------------------------------ |
| `tsconfig.base.json`     | — (root)        | Target ES2025, NodeNext module, strict mode, isolatedModules, sourceMap  |
| `tsconfig.shared.json`   | `tsconfig.base` | `declaration: true`, `declarationMap: true`                              |
| `tsconfig.backend.json`  | `tsconfig.base` | `types: ["node"]`, declarations                                          |
| `tsconfig.frontend.json` | `tsconfig.base` | `lib: ["ES2025","DOM","DOM.Iterable"]`, `jsx: "react-jsx"`, declarations |

### 4.3 Tsup Configs

| File                      | Purpose                                                                    |
| ------------------------- | -------------------------------------------------------------------------- |
| `tsup.base.config.ts`     | Entry `src/index.ts`, ESM+CJS output, dts, sourcemap, treeshake, no minify |
| `tsup.shared.config.ts`   | Extends base                                                               |
| `tsup.backend.config.ts`  | Extends base, `platform: "node"`                                           |
| `tsup.frontend.config.ts` | Extends base, `platform: "browser"`                                        |

---

## 5. Package Generator (`scripts/create-package/`)

This is an **interactive CLI** (`node ./scripts/create-package/index.mjs`) that scaffolds a new package in `packages/{shared,backend,frontend}/`.

### 5.1 Workflow

1. **Prompt Template** — Select `shared`, `backend`, or `frontend`
2. **Prompt Package Name** — Must match `/^[a-z][a-z0-9-]*$/`
3. **Prompt Description** — 10–150 chars, must contain letter/number
4. **Prompt Keywords** — 1–10 keywords, each 2–30 chars, comma-separated
5. **Confirm** — Summary of all inputs
6. **Load Template** — Reads `templates/{type}/template.json`
7. **Build Metadata** — Constructs scoped name, directories, config references
8. **Check Exists** — Prevents overwriting existing packages
9. **Create Directory** — Creates `packages/{type}/{name}/`
10. **Copy Base Template** — Copies `templates/base/src/index.ts`
11. **Generate Files** — Writes `package.json`, `README.md`, `tsconfig.json`, `eslint.config.mjs`, `tsup.config.ts`

### 5.2 Key Files

| File                              | Lines | Purpose                                                                                                                                                                                        |
| --------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants.mjs`                   | 154   | All constants: regex, validation bounds, metadata (scope, version, license, author, repo URLs, publish access, node engine), build outputs (main, module, types), scripts, shared configs path |
| `prompts.mjs`                     | 63    | Uses `inquirer`: select, input, confirm                                                                                                                                               |
| `validators.mjs`                  | 143   | Validates package name, description (length + alphanumeric), keywords (count + length)                                                                                                         |
| `utils.mjs`                       | 39    | `normalizeText` (trim, collapse spaces), `normalizeKeywords` (split, lowercase, dedupe)                                                                                                        |
| `metadata.mjs`                    | 45    | Builds metadata object: scopedPackageName, packageDirectory, description, keywords, config                                                                                                     |
| `package.mjs`                     | 32    | `checkPackageExists` (fs.access), `createPackageDirectory` (fs.mkdir recursive)                                                                                                                |
| `template.mjs`                    | 20    | Loads and parses `templates/{type}/template.json`                                                                                                                                              |
| `generators/package-json.mjs`     | 81    | Writes complete `package.json` with exports map, scripts, publishConfig, engines                                                                                                               |
| `generators/readme.mjs`           | 60    | Writes `README.md` with installation, usage, repo info                                                                                                                                         |
| `generators/tsconfig.mjs`         | 23    | Writes `tsconfig.json` extending the shared config                                                                                                                                             |
| `generators/eslint.mjs`           | 22    | Writes `eslint.config.mjs` importing from shared configs                                                                                                                                       |
| `generators/tsup.mjs`             | 24    | Writes `tsup.config.ts` importing from shared configs                                                                                                                                          |
| `generators/copy-template.mjs`    | 18    | Copies `templates/base/` into the new package directory                                                                                                                                        |
| `generators/generate-package.mjs` | 30    | Orchestrates all generators; rolls back (deletes directory) on failure                                                                                                                         |

### 5.3 Template Configuration

| Template   | Directory           | Prefix     | TSConfig            | ESLint            | Tsup            |
| ---------- | ------------------- | ---------- | ------------------- | ----------------- | --------------- |
| `shared`   | `packages/shared`   | `shared`   | `tsconfig.shared`   | `eslint.shared`   | `tsup.shared`   |
| `backend`  | `packages/backend`  | `backend`  | `tsconfig.backend`  | `eslint.backend`  | `tsup.backend`  |
| `frontend` | `packages/frontend` | `frontend` | `tsconfig.frontend` | `eslint.frontend` | `tsup.frontend` |

### 5.4 Base Template

`templates/base/src/index.ts` contains a single empty export:
```ts
export {};
```

---

## 6. Package Publisher (`scripts/package-publisher/`)

This is a **full interactive CLI** (`node ./scripts/package-publisher/index.mjs`) that manages npm publishing workflow for the entire monorepo. It runs an infinite loop until the user exits.

### 6.1 Core Actions

| Action                   | Constant                   | Description                                            |
| ------------------------ | -------------------------- | ------------------------------------------------------ |
| Publish New Package      | `PUBLISH_NEW_PACKAGE`      | Publish a single unpublished package                   |
| Publish New Packages     | `PUBLISH_NEW_PACKAGES`     | Publish selected unpublished packages                  |
| Publish All New Packages | `PUBLISH_ALL_NEW_PACKAGES` | Publish all unpublished packages                       |
| Republish Package        | `REPUBLISH_PACKAGE`        | Republish a single published package with version bump |
| Republish Packages       | `REPUBLISH_PACKAGES`       | Republish selected published packages                  |
| Republish All Packages   | `REPUBLISH_ALL_PACKAGES`   | Republish all published packages                       |
| Package Status           | `PACKAGE_STATUS_MAP`           | View status table of all packages                      |
| Login                    | `LOGIN`                    | npm login                                              |
| Logout                   | `LOGOUT`                   | npm logout                                             |
| Exit                     | `EXIT`                     | Exit CLI                                               |

### 6.2 Package Status Values

| Status             | Meaning                                                    |
| ------------------ | ---------------------------------------------------------- |
| `UNPUBLISHED`      | Not yet on npm                                             |
| `SYNCED`           | Local version == remote version                            |
| `UPDATE_AVAILABLE` | Local version > remote version                             |
| `OUTDATED`         | Local version < remote version (shouldn't happen normally) |

### 6.3 Key Modules

#### 6.3.1 `constants.mjs`
Defines frozen constants for actions, version types (`patch`/`minor`/`major`/`custom`), exit codes, package statuses, summary labels, batch labels, dependency types/scopes, and table alignments.

#### 6.3.2 `types.mjs`
JSDoc type definitions for:
- `PublishConfig` (access: 'public')
- `Dependency` (name, version, type, scope)
- `WorkspacePackage` (packageType, workspaceName, directory)
- `PackageJson` (name, version, dependencies, devDependencies, peerDependencies, optionalDependencies, publishConfig)
- `PublishPackageMetadata` (full runtime metadata with status)
- `TableColumn` (key, title, align)

#### 6.3.3 `errors.mjs`
Custom error classes extending `CliError`:
- `CliError` — base
- `AuthenticationError`
- `ValidationError`
- `VersionError`
- `PublishError`
- `JsonError`

#### 6.3.4 `color.mjs`
Wraps `picocolors` into semantic color functions: `success` (green), `warning` (yellow), `error` (red), `info` (cyan), `heading` (bold), `dim`, `muted` (gray).

#### 6.3.5 `npm.mjs`
Abstraction layer over npm CLI:
- `whoami()` — returns current npm user or null
- `getPackageInfo(name)` — fetches published version from npm (handles 404)
- `login()` — interactive npm login
- `logout()` — interactive npm logout
- `publish(directory, version)` / `republish(directory, version)` — handles prerelease dist-tags automatically

#### 6.3.6 `utils.mjs`
- `readJson` / `writeJson` — JSON file I/O with indentation preservation
- `pathExists` — fs.access check
- `runCommand` — exec with Windows shell escaping
- `runInteractiveCommand` — spawn with stdio: inherit (for login/logout/npm publish)

#### 6.3.7 `version.mjs`
- `validateVersion` — ensures string is valid semver
- `calculateVersion` — computes next version (patch/minor/major/custom)
- `updatePackageVersion` — patches `package.json` while preserving indent and trailing newline

#### 6.3.8 `metadata.mjs`
- `getDependencyScope` — INTERNAL if scoped under `@beautinique`, else EXTERNAL
- `getDependencies` — collects all dependency types from package.json
- `getPackageMetadata` — builds full `PublishPackageMetadata` including status
- `getPackagesMetadata` — fetches metadata for all workspace packages

#### 6.3.9 `package.mjs`
- `findPackages()` — enumerates all `packages/*/*/` directories, returns sorted `WorkspacePackage[]`
- `findPackage(workspaceName)` — finds a single workspace package by name

#### 6.3.10 `package-selection.mjs`
- `getPackage(filter)` — prompts single selection from filtered packages
- `getSelectedPackages(filter)` — prompts multi-selection
- `getPackages(filter)` — returns all matching without prompt

#### 6.3.11 `package-status.mjs`
Displays a formatted table of all packages (workspace, npm name, local version, remote version, status) plus a summary count.

#### 6.3.12 `prompts.mjs`
Uses `inquirer` to build prompts for:
- Action selection menu (with dynamic Login/Logout)
- Package selection (single / multi)
- Version strategy selection (patch/minor/major/custom)
- Custom version input (live semver validation)
- Publish/republish confirmation dialogs

#### 6.3.13 `validators.mjs`
- `validateRequiredFiles` — ensures `package.json` and `README.md` exist
- `validatePublishVersion` — local > remote for republish; valid for new publish
- `validatePublished` — ensures package is already on npm
- `validatePublishConfig` — requires `publishConfig.access === "public"`

#### 6.3.14 `publish.mjs`
- `publishNewPackage` — validates, confirms, publishes
- `publishPackages` — sorts by dependency order, confirms, batch publishes
- Sorts packages so dependencies are published before dependents

#### 6.3.15 `republish.mjs`
- `republishPackage` — selects version strategy, calculates next, **checks the latest version of every dependency**, confirms, republishes
- `republishPackages` — batch republish with dependency ordering
- **Dependencies are updated by every republish** (see below)
- **Rollback safety**: If republish fails, restores the original `package.json` files **and the lockfile** (`npm install` rewrites it)

**What a republish does with the dependencies of the package** (`republish/dependency-update.mjs`). The confirmation shows every change before anything is written (a major step is in yellow, and what is left on purpose is listed); after "yes" the ranges are written, `npm install` runs, the package is built and published:

| Dependency | What happens |
| --- | --- |
| A package of this repository that is in the **same** release | takes the version it is released with (as before) |
| A package of this repository that is **not** in the release (its `dependencies`, `devDependencies` **and** `peerDependencies`) | goes to the latest version on npm, so a package never keeps a peer range that lacks a fix |
| Any other package (`dependencies`, `devDependencies`, `optionalDependencies`) | goes to the latest version on npm, in the style of its range (`^1.2.3` → `^1.4.0`, `~` stays `~`) |
| An **exact** version (`"1.0.1"`) | left: an exact version is a pin, put there on purpose (for example `@mediapipe/tasks-vision`, which has to be the same version as the constants that load its WebAssembly) |
| `typescript` | left: a major version of the compiler is raised by hand. The list is `DEPENDENCY_UPDATE_EXCLUDED_PACKAGES` in `republish/constants.mjs` |
| The `peerDependencies` of other people's packages (`react ^19.0.0`) | left: a peer range says what the package works with, and raising it would shut out everyone who has an older one |
| A range that is not one version (`^7 \|\| ^8`, `>=18`, a tag, `workspace:`), a package npm does not know, or one npm cannot be asked about (offline) | left (offline gives a warning; it does not stop the republish) |

A dependency is never moved to an older version.

The logic is in pure functions (`planDependencyUpdates`, `applyDependencyUpdates`) tested with Node's own runner: `npm run test:scripts`.

#### 6.3.16 `batch-operation.mjs`
Generic batch runner with:
- Success/failure counting
- Continue-on-error behavior
- Summary reporting

#### 6.3.17 `dependency-sort.mjs`
Topological sort of packages by internal dependencies. Detects circular dependencies. Ensures dependencies are processed before dependents.

#### 6.3.18 `reporter.mjs`
Console output helpers: `reportSection`, `reportDivider`, `reportInfo`, `reportSuccess`, `reportWarning`, `reportError`, `reportTable`, `reportSummary`.

#### 6.3.19 `table.mjs`
Custom table renderer supporting left/center/right alignment, bold headers, colored first column, and separator rows.

#### 6.3.20 `paths.mjs`
Defines `ROOT_DIRECTORY` (cwd), `PACKAGES_DIRECTORY`, and helpers for `package.json` / `README.md` paths.

#### 6.3.21 `auth.mjs`
- `ensureLoggedIn()` — throws if not authenticated
- `ensureLoggedOut()` — throws if already authenticated

---

## 7. Templates (`templates/`)

Each template defines a `template.json` that maps the package type to its config files:

| Template   | Directory           | Prefix     | Configs                                           |
| ---------- | ------------------- | ---------- | ------------------------------------------------- |
| `backend`  | `packages/backend`  | `backend`  | tsconfig.backend, eslint.backend, tsup.backend    |
| `frontend` | `packages/frontend` | `frontend` | tsconfig.frontend, eslint.frontend, tsup.frontend |
| `shared`   | `packages/shared`   | `shared`   | tsconfig.shared, eslint.shared, tsup.shared       |

**Base template** (`templates/base/src/index.ts`): A single `export {};` line that serves as the starting point for every new package.

---

## 8. Documentation & Supporting Files

| File                 | Content                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `README.md`          | Project overview, package categories, requirements, 10-step checklist                |
| `CONTRIBUTING.md`    | Fork → branch → PR workflow, code style (ESLint+Prettier), commit message guidelines |
| `CHANGELOG.md`       | Semantic versioning, current version `1.0.0` (initial monorepo setup)                |
| `LICENSE`            | MIT License, Copyright 2026 Nageshwar Pawar                                          |
| `SECURITY.md`        | Security vulnerability reporting policy                                              |
| `CODE_OF_CONDUCT.md` | Respectful collaboration expectations                                                |


---

## 9. Code Quality & Formatting

### Prettier (`.prettierrc`)
- Print width: 100
- Tab width: 2 (spaces)
- Semi: true, single quotes, trailing commas: all
- End of line: LF
- Bracket spacing: true, bracket same line: false
- Arrow parens: always

### Prettier Ignore (`.prettierignore`)
Ignores `node_modules`, `dist`, `dist-ssr`, `build`, `out`, `coverage`, `*.min.js`, `.pnpm-store`, `.turbo`.

### Gitignore (`.gitignore`)
Ignores `node_modules`, build outputs, coverage, `*.tsbuildinfo`, logs, `.env`, IDE files (`.vscode` partial, `.idea/`), OS files (`.DS_Store`, `Thumbs.db`), `.pnpm-store`, `.turbo`, `*.min.js`, temp/runtime files.

---

## 10. Git Status

- **Branch:** `test/v1`
- **Status:** Clean working tree, up to date with remote
- **Recent commits:**
  - `8920174` feat: enhance README generation with additional sections
  - `14eea23` chore: update license from ISC to MIT
  - `e211fa5` feat: update package versions and enhance summary reporting
  - `75acebd` feat: enhance table formatting with color coding
  - `4e54f1c` feat: enhance user prompts with improved formatting
  - Plus 10 more earlier commits covering validation, batch operations, color utilities, and error handling

---

## 11. Architecture Summary

```
Root (BQ-Packages)
├── configs/          ← Shared toolchain configs (ESLint, TS, Tsup)
├── scripts/
│   ├── clean.mjs  ← Scaffold clean dist and unnecessary files
│   ├── create-package/  ← Scaffold new packages
│   │   └── generators/  ← File generators (json, ts, eslint, tsup, readme)
│   └── package-publisher/ ← npm publish/republish CLI
│       ├── npm.mjs          ← npm CLI wrapper
│       ├── version.mjs      ← semver calculation + file patching
│       ├── metadata.mjs     ← workspace discovery + package metadata
│       ├── dependency-sort.mjs ← topological sort
│       ├── publish.mjs / republish.mjs ← publish workflows
│       ├── batch-operation.mjs ← concurrent batch runner
│       ├── reporter.mjs / table.mjs / color.mjs ← terminal UI
│       ├── prompts.mjs / package-selection.mjs ← inquirer flows
│       └── validators.mjs / auth.mjs / paths.mjs ← helpers
└── templates/
    ├── base/                ← Shared src/ starter
    ├── shared/backend/frontend ← Type-specific template configs
```

The repository is well-architected with clear separation of concerns: configuration files are centralized in `configs/`, package scaffolding is isolated in `scripts/create-package/`, and the entire publishing workflow is encapsulated in `scripts/package-publisher/`. Templates decouple package structure from generation logic.