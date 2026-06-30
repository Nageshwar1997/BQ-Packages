/**
 * @import {
 *   REPUBLISH_ACTIONS,
 *   TABLE_ALIGNMENTS,
 *   VERSION_TYPES,
 * } from './constants.mjs'
 */

/**
 * @import {
 *   DEPENDENCY_SCOPES,
 *   DEPENDENCY_TYPES,
 *   PACKAGE_STATUS_MAP,
 *   TABLE_ALIGNMENTS,
 * } from '../common/constants.mjs'
 */

/**
 * @import { WorkspacePackage } from '../common/types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                  COMMON                                    */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {{
 *   access?: 'public';
 * }} PublishConfig
 */

/* -------------------------------------------------------------------------- */
/*                               DEPENDENCIES                                 */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {{
 *   name: string;
 *   version: string;
 *   type: (typeof DEPENDENCY_TYPES)[keyof typeof DEPENDENCY_TYPES];
 *   scope: (typeof DEPENDENCY_SCOPES)[keyof typeof DEPENDENCY_SCOPES];
 * }} Dependency
 */

/* -------------------------------------------------------------------------- */
/*                               PACKAGE.JSON                                 */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {{
 *   name: string;
 *   version: string;
 *   dependencies?: Record<string, string>;
 *   devDependencies?: Record<string, string>;
 *   peerDependencies?: Record<string, string>;
 *   optionalDependencies?: Record<string, string>;
 *   publishConfig?: PublishConfig;
 * }} PackageJson
 */



/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {(typeof VERSION_TYPES)[keyof typeof VERSION_TYPES]} VersionType
 */

/**
 * @typedef {(typeof REPUBLISH_ACTIONS)[keyof typeof REPUBLISH_ACTIONS]} RepublishAction
 */

/**
 * @typedef {(typeof TABLE_ALIGNMENTS)[keyof typeof TABLE_ALIGNMENTS]} TableAlignment
 */

/**
 * @typedef {{
 *   key: string;
 *   title: string;
 *   align?: TableAlignment;
 * }} TableColumn
 */
export {};
