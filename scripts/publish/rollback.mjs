import { getPackageJsonPath } from './paths.mjs';
import { parseData, readFileByPath, writeJson } from './utils.mjs';

/**
 * @import { PackageMetadata, PackageJson } from './types.mjs'
 */

/**
 * @typedef {{
 *   metadata: PackageMetadata;
 *   packageJson: PackageJson;
 *   indent: string | number;
 *   trailingNewline: boolean;
 * }} PackageSnapshot
 */

/**
 * @typedef {Map<string, PackageSnapshot>} PackageSnapshotMap
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns the indentation used by a JSON document.
 *
 * @param {string} content
 * @returns {string | number}
 */
function detectJsonIndent(content) {
  const match = content.match(/\n([ \t]+)"/);

  return match?.[1] ?? 2;
}

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
 * @param {PackageMetadata[]} packages
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
