/* -------------------------------------------------------------------------- */
/*                                  COMMON                                    */
/* -------------------------------------------------------------------------- */

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
/*                     PUBLISH/REPUBLISh PACKAGE METADATA                     */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {{
 *   npmPackageName: string;
 *   localVersion: string;
 *   remoteVersion: string | null;
 *   published: boolean;
 *   publishConfig: PackagePublishConfig | null;
 *   dependencies: Dependency[];
 *   status: (typeof PACKAGE_STATUS_MAP)[keyof typeof PACKAGE_STATUS_MAP];
 * } & WorkspacePackage} PublishPackageMetadata
 */

/* -------------------------------------------------------------------------- */
/*                               PACKAGE.JSON                                 */
/* -------------------------------------------------------------------------- */

/**
 * Package dependencies.
 *
 * @typedef {Record<string, string>} PackageDependencies
 */

/**
 * Package repository.
 *
 * @typedef {object} PackageRepository
 * @property {'git'} type
 * @property {string} url
 * @property {string} directory
 */

/**
 * Package bugs.
 *
 * @typedef {object} PackageBugs
 * @property {string} url
 */

/**
 * Package exports entry.
 *
 * @typedef {object} PackageExportEntry
 * @property {string} types
 * @property {string} import
 * @property {string} require
 * @property {string} default
 */

/**
 * Package exports.
 *
 * @typedef {object} PackageExports
 * @property {PackageExportEntry} .
 * @property {string} './package.json'
 */

/**
 * Package scripts.
 *
 * @typedef {object} PackageScripts
 * @property {string} build
 * @property {string} dev
 * @property {string} lint
 * @property {string} typecheck
 */

/**
 * Package publish configuration.
 *
 * @typedef {object} PackagePublishConfig
 * @property {'public'} access
 */

/**
 * Package engines.
 *
 * @typedef {object} PackageEngines
 * @property {string} node
 */

/**
 * Package.json.
 *
 * @typedef {object} PackageJson
 * @property {string} name
 * @property {string} version
 * @property {string} description
 * @property {string[]} keywords
 * @property {string} author
 * @property {string} license
 * @property {PackageRepository} repository
 * @property {PackageBugs} bugs
 * @property {string} homepage
 * @property {'module'} type
 * @property {string} main
 * @property {string} module
 * @property {string} types
 * @property {string[]} files
 * @property {boolean} sideEffects
 * @property {PackageExports} exports
 * @property {PackageScripts} scripts
 * @property {PackagePublishConfig} publishConfig
 * @property {PackageEngines} engines
 * @property {PackageDependencies | undefined} [dependencies]
 * @property {PackageDependencies | undefined} [devDependencies]
 * @property {PackageDependencies | undefined} [peerDependencies]
 * @property {PackageDependencies | undefined} [optionalDependencies]
 */
