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
 *   publishConfig: PublishConfig | null;
 *   dependencies: Dependency[];
 *   status: (typeof PACKAGE_STATUS_MAP)[keyof typeof PACKAGE_STATUS_MAP];
 * } & WorkspacePackage} PublishPackageMetadata
 */
