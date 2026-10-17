import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { readFileByPath, writeJson } from '../common//utils.mjs';
import { getPackageJsonPath, ROOT_DIRECTORY } from '../common/paths.mjs';
import { parseData, pathExists } from '../common/utils.mjs';
import { detectJsonIndent } from './utils.mjs';

/**
 * @import { PackageJson, PublishPackageMetadata } from '../common/types.mjs'
 * @import { PackageSnapshot, PackageSnapshotMap } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Clones parsed JSON data so future mutations cannot affect the snapshot.
 *
 * @param {PackageJson} packageJson
 * @returns {PackageJson}
 */
function clonePackageJson(packageJson) {
  return structuredClone(packageJson);
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Creates a complete in-memory package.json snapshot for selected packages.
 *
 * @param {PublishPackageMetadata[]} packages
 * @returns {Promise<PackageSnapshotMap>}
 */
export async function createSnapshot(packages) {
  /** @type {PackageSnapshotMap} */
  const snapshot = new Map();

  for (const metadata of packages) {
    const packageJsonPath = getPackageJsonPath(metadata.directory);
    const content = await readFileByPath(packageJsonPath);
    const packageJson = parseData(content);

    snapshot.set(metadata.npmPackageName, {
      metadata,
      packageJson: clonePackageJson(packageJson),
      indent: detectJsonIndent(content),
      trailingNewline: content.endsWith('\n'),
    });
  }

  return snapshot;
}

/**
 * Keeps the text of the lockfile of the repository. A republish that updates dependencies runs
 * `npm install`, which rewrites it: if the republish fails, the lockfile goes back with the
 * package.json files, so the two never disagree.
 *
 * @returns {Promise<{ filePath: string; content: string } | null>} `null` when there is no lockfile.
 */
export async function createLockfileSnapshot() {
  const filePath = path.join(ROOT_DIRECTORY, 'package-lock.json');

  if (!(await pathExists(filePath))) {
    return null;
  }

  return { filePath, content: await readFileByPath(filePath) };
}

/**
 * Puts the lockfile back as it was.
 *
 * @param {{ filePath: string; content: string } | null} snapshot
 * @returns {Promise<void>}
 */
export async function restoreLockfileSnapshot(snapshot) {
  if (snapshot) {
    await writeFile(snapshot.filePath, snapshot.content, 'utf8');
  }
}

/**
 * Restores complete package.json files from a snapshot.
 *
 * @param {PackageSnapshotMap} snapshot
 * @returns {Promise<void>}
 */
export async function restoreSnapshot(snapshot) {
  for (const { metadata, packageJson, indent, trailingNewline } of snapshot.values()) {
    await writeJson(getPackageJsonPath(metadata.directory), packageJson, {
      indent,
      trailingNewline,
    });
  }
}
