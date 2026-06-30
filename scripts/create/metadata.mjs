/**
 * @import { PackageMetadata, BuildPackageMetadataOptions } from './types.mjs'
 */

import { PACKAGE_SCOPE } from '../common/constants.mjs';

/* -------------------------------------------------------------------------- */
/*                                  METADATA                                  */
/* -------------------------------------------------------------------------- */

/**
 * Builds package metadata.
 *
 * @param {BuildPackageMetadataOptions} options
 * @returns {PackageMetadata}
 */
export function buildPackageMetadata(options) {
  const { description, keywords, packageName, template, templateConfig } = options;
  return {
    template,
    packageName,
    scopedPackageName: `${PACKAGE_SCOPE}/${templateConfig.packagePrefix}-${packageName}`,
    packageDirectory: path.join(process.cwd(), templateConfig.directory, packageName),
    description,
    keywords,
    packagePrefix: templateConfig.packagePrefix,
    directory: templateConfig.directory,
    config: templateConfig.config,
  };
}
