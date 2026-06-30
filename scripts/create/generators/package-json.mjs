import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  PACKAGE_AUTHOR,
  PACKAGE_BUGS_URL,
  PACKAGE_EXPORTS,
  PACKAGE_FILES,
  PACKAGE_HOMEPAGE,
  PACKAGE_LICENSE,
  PACKAGE_MAIN,
  PACKAGE_MODULE,
  PACKAGE_NODE_ENGINE,
  PACKAGE_PUBLISH_ACCESS,
  PACKAGE_REPOSITORY,
  PACKAGE_SCRIPTS,
  PACKAGE_SIDE_EFFECTS,
  PACKAGE_TYPE,
  PACKAGE_TYPES,
  PACKAGE_VERSION,
} from '../constants.mjs';

/* -------------------------------------------------------------------------- */
/*                               PACKAGE JSON                                 */
/* -------------------------------------------------------------------------- */

/**
 * Generates the package.json file.
 *
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export async function generatePackageJson(metadata) {
  const packageJson = {
    name: metadata.scopedPackageName,

    version: PACKAGE_VERSION,

    description: metadata.description,

    keywords: metadata.keywords,

    author: PACKAGE_AUTHOR,

    license: PACKAGE_LICENSE,

    repository: {
      ...PACKAGE_REPOSITORY,
      directory: `${metadata.directory}/${metadata.packageName}`,
    },

    bugs: { url: PACKAGE_BUGS_URL },

    homepage: `${PACKAGE_HOMEPAGE}/tree/main/${metadata.directory}/${metadata.packageName}#readme`,

    type: PACKAGE_TYPE,

    main: PACKAGE_MAIN,

    module: PACKAGE_MODULE,

    types: PACKAGE_TYPES,

    files: PACKAGE_FILES,

    sideEffects: PACKAGE_SIDE_EFFECTS,

    exports: PACKAGE_EXPORTS,

    scripts: PACKAGE_SCRIPTS,

    publishConfig: { access: PACKAGE_PUBLISH_ACCESS },

    engines: { node: PACKAGE_NODE_ENGINE },
  };

  await writeFile(
    path.join(metadata.packageDirectory, 'package.json'),
    `${JSON.stringify(packageJson, null, 2)}\n`,
    'utf8',
  );
}
