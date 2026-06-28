/**
 * @import {
 *   ACTIONS,
 *   DEPENDENCY_SCOPES,
 *   DEPENDENCY_TYPES,
 *   PACKAGE_STATUS,
 *   VERSION_TYPES,
 * } from './constants.mjs'
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
 *   status: (typeof PACKAGE_STATUS)[keyof typeof PACKAGE_STATUS];
 * }} PackageMetadata
 */

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {(typeof VERSION_TYPES)[keyof typeof VERSION_TYPES]} VersionType
 */

/**
 * @typedef {(typeof ACTIONS)[keyof typeof ACTIONS]} Action
 */

export {};
