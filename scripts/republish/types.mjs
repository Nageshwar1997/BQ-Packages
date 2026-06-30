/**
 * @import { REPUBLISH_ACTIONS, VERSION_TYPES } from './constants.mjs'
 * @import { PackageJson, PublishPackageMetadata } from '../common/types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {'^' | '~' | ''} SemverPrefix
 */

/**
 * @typedef {(typeof VERSION_TYPES)[keyof typeof VERSION_TYPES]} VersionType
 */

/**
 * @typedef {(typeof REPUBLISH_ACTIONS)[keyof typeof REPUBLISH_ACTIONS]} RepublishAction
 */

/**
 * @typedef {{
 *   metadata: PublishPackageMetadata;
 *   packageJson: PackageJson;
 *   indent: string | number;
 *   trailingNewline: boolean;
 * }} PackageSnapshot
 */

/**
 * @typedef {Map<string, PackageSnapshot>} PackageSnapshotMap
 */

export {};
