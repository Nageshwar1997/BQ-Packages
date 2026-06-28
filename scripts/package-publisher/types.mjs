/**
 * @typedef {{
 *   name: string;
 *   version: string;
 *   type: string;
 *   scope: string;
 * }} Dependency
 */

/**
 * @typedef {{
 *   packageType: string;
 *   name: string;
 *   packageName: string;
 *   directory: string;
 *   localVersion: string;
 *   remoteVersion: string | null;
 *   published: boolean;
 *   publishConfig: {
 *     access?: string;
 *   } | null;
 *   dependencies: Dependency[];
 *   status: string;
 * }} PackageMetadata
 */

/**
 * @typedef {{
 *   packageType: string;
 *   name: string;
 *   directory: string;
 * }} WorkspacePackage
 */

/**
 * @typedef {{
 *   dependencies?: Record<string, string>;
 *   devDependencies?: Record<string, string>;
 *   peerDependencies?: Record<string, string>;
 *   optionalDependencies?: Record<string, string>;
 *   name: string;
 *   version: string;
 *   publishConfig?: {
 *     access?: string;
 *   };
 * }} PackageJson
 */

/**
 * @typedef {'patch' | 'minor' | 'major' | 'custom'} VersionType
 */

/**
 * @typedef {'publish-new-package' | 'publish-new-packages' | 'publish-all-new-packages' | 'republish-package' | 'republish-packages' | 'republish-all-packages' | 'package-status' | 'login' | 'logout' | 'exit'} Action
 */

export {};
