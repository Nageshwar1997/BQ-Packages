import path from 'node:path';

import { PACKAGE_SCOPE } from '../common/constants.mjs';

/* -------------------------------------------------------------------------- */
/*                                  METADATA                                  */
/* -------------------------------------------------------------------------- */

/**
 * Builds package metadata.
 *
 * @param {object} options
 * @param {"shared" | "backend" | "frontend"} options.template
 * @param {string} options.packageName
 * @param {string} options.description
 * @param {string[]} options.keywords
 * @param {object} options.templateConfig
 * @returns {object}
 */
export function buildPackageMetadata({
  template,
  packageName,
  description,
  keywords,
  templateConfig,
}) {
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
