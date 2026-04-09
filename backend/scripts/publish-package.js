#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const backendRoot = path.resolve(__dirname, "..");
const packageRoots = ["shared", "modules"];
const args = process.argv.slice(2);

function normalize(value) {
  return value.trim().toLowerCase();
}

function runCommand(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      npm_config_offline: "false",
    },
  });

  if (result.status !== 0) {
    const error = new Error(`${command} ${commandArgs.join(" ")} failed`);
    error.exitCode = result.status ?? 1;
    throw error;
  }
}

function runCommandWithResult(command, commandArgs, cwd) {
  return spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      npm_config_offline: "false",
    },
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function discoverPackages(rootDir) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name === "package.json") {
        const pkg = readJson(fullPath);
        const packageDir = path.dirname(fullPath);
        const relativeDir = path.relative(backendRoot, packageDir);

        results.push({
          name: pkg.name,
          version: pkg.version,
          dir: packageDir,
          relativeDir,
          shortName: path.basename(packageDir),
        });
      }
    }
  }

  for (const rootName of packageRoots) {
    const rootPath = path.join(rootDir, rootName);

    if (!fs.existsSync(rootPath)) {
      continue;
    }

    walk(rootPath);
  }

  return results;
}

function printUsage(packages) {
  console.log("Usage:");
  console.log("  npm run publish:package -- <package-name-or-folder>");
  console.log("  npm run publish:package -- --list");
  console.log("");
  console.log("Available packages:");

  for (const pkg of packages) {
    console.log(`  - ${pkg.name} (${pkg.relativeDir})`);
  }
}

const packages = discoverPackages(backendRoot);
const input = args[0];

if (!packages.length) {
  console.error("No publishable packages were found under backend/shared or backend/modules.");
  process.exit(1);
}

if (!input || input === "--list") {
  printUsage(packages);
  process.exit(input === "--list" ? 0 : 1);
}

const normalizedInput = normalize(input);
const matches = packages.filter((pkg) => {
  return [
    pkg.name,
    pkg.shortName,
    pkg.relativeDir,
  ].some((value) => normalize(value) === normalizedInput);
});

if (!matches.length) {
  console.error(`Package "${input}" not found.`);
  printUsage(packages);
  process.exit(1);
}

if (matches.length > 1) {
  console.error(`Package "${input}" matched multiple packages. Please use the full package name or path.`);
  for (const pkg of matches) {
    console.error(`  - ${pkg.name} (${pkg.relativeDir})`);
  }
  process.exit(1);
}

const selectedPackage = matches[0];
const packageJsonPath = path.join(selectedPackage.dir, "package.json");
const packageLockPath = path.join(selectedPackage.dir, "package-lock.json");
const originalPackageJson = fs.readFileSync(packageJsonPath, "utf8");
const originalPackageLock = fs.existsSync(packageLockPath)
  ? fs.readFileSync(packageLockPath, "utf8")
  : null;

console.log(`Selected package: ${selectedPackage.name}`);
console.log(`Location: ${selectedPackage.relativeDir}`);
console.log(`Current version: ${selectedPackage.version}`);
console.log("");

console.log("Checking npm authentication...");
const authResult = runCommandWithResult("npm", ["whoami"], selectedPackage.dir);

if (authResult.status !== 0) {
  console.error("");
  console.error("npm authentication check failed. Please verify npm login before publishing.");
  process.exit(authResult.status ?? 1);
}

try {
  // npm does not allow re-publishing the same version, so we bump patch before publish.
  runCommand("npm", ["version", "patch", "--no-git-tag-version"], selectedPackage.dir);
  runCommand("npm", ["run", "build"], selectedPackage.dir);
  runCommand("npm", ["publish"], selectedPackage.dir);
} catch (error) {
  fs.writeFileSync(packageJsonPath, originalPackageJson, "utf8");

  if (originalPackageLock !== null) {
    fs.writeFileSync(packageLockPath, originalPackageLock, "utf8");
  }

  process.exit(error.exitCode ?? 1);
}
