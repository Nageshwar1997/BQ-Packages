import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  PACKAGE_AUTHOR,
  PACKAGE_BUGS_URL,
  PACKAGE_HOMEPAGE,
  PACKAGE_LICENSE,
  PACKAGE_REPOSITORY,
} from '../constants.mjs';

/**
 * @import { PackageMetadata } from '../types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                   README                                   */
/* -------------------------------------------------------------------------- */

/**
 * Generates the README.md file.
 *
 * @param {PackageMetadata} metadata
 * @returns {Promise<void>}
 */
export async function generateReadme(metadata) {
  const readme = `# ${metadata.scopedPackageName}

${metadata.description}

## Installation

\`\`\`bash
npm install ${metadata.scopedPackageName}
\`\`\`

## Usage

\`\`\`ts
import {} from '${metadata.scopedPackageName}';
\`\`\`

## Repository

${PACKAGE_REPOSITORY.url.replace('git+', '').replace('.git', '')}

## Homepage

${PACKAGE_HOMEPAGE}

## Issues

${PACKAGE_BUGS_URL}

## Author

${PACKAGE_AUTHOR}

## License

This package is licensed under the ${PACKAGE_LICENSE} License. See the root \`LICENSE\` file for details.
`;

  await writeFile(path.join(metadata.packageDirectory, 'README.md'), readme, 'utf8');
}
