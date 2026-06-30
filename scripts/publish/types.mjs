/**
 * @import {
 *   PUBLISH_ACTIONS,
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
/*                              WORKSPACE PACKAGE                             */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {{
 *   packageType: string;
 *   workspaceName: string;
 *   directory: string;
 * }} WorkspacePackage
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
/*                              PACKAGE METADATA                              */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {{
 *   packageType: string;
 *   workspaceName: string;
 *   npmPackageName: string;
 *   directory: string;
 *   localVersion: string;
 *   remoteVersion: string | null;
 *   published: boolean;
 *   publishConfig: PublishConfig | null;
 *   dependencies: Dependency[];
 *   status: (typeof PACKAGE_STATUS_MAP)[keyof typeof PACKAGE_STATUS_MAP];
 * }} PackageMetadata
 */

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {(typeof VERSION_TYPES)[keyof typeof VERSION_TYPES]} VersionType
 */

/**
 * @typedef {(typeof PUBLISH_ACTIONS)[keyof typeof PUBLISH_ACTIONS]} PublishAction
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
