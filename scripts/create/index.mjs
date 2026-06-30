import { bold, cyan, gray, green, magenta, white } from '../common/colors.mjs';
import { EXIT_CODES } from '../common/constants.mjs';
import {
  report,
  reportClear,
  reportError,
  reportInfo,
  reportSection,
  reportSuccess,
} from '../common/reporter.mjs';
import { copyBaseTemplate } from './generators/copy-template.mjs';
import { generatePackage } from './generators/generate-package.mjs';
import { buildPackageMetadata } from './metadata.mjs';
import { checkPackageExists, createPackageDirectory } from './package.mjs';
import {
  promptConfirmation,
  promptDescription,
  promptKeywords,
  promptPackageName,
  promptTemplate,
} from './prompts.mjs';
import { loadTemplate } from './template.mjs';

/* -------------------------------------------------------------------------- */
/*                                    MAIN                                    */
/* -------------------------------------------------------------------------- */

/**
 * Starts the package generator.
 */
async function main() {
  reportClear();

  reportInfo('✨ Beautinique Package Generator\n');

  const template = await promptTemplate();
  const packageName = await promptPackageName();
  const description = await promptDescription();
  const keywords = await promptKeywords();

  reportSection('Package Details');

  report(`${bold(cyan('Template'))}     : ${magenta(template)}`);
  report(`${bold(cyan('Package Name'))} : ${green(packageName)}`);
  report(`${bold(cyan('Description'))}  : ${white(description)}`);
  report(`${bold(cyan('Keywords'))}     : ${gray(keywords.join(', '))}`);

  const confirmed = await promptConfirmation();

  if (!confirmed) {
    reportError('Package creation cancelled.');
    return;
  }

  const templateConfig = await loadTemplate(template);

  const metadata = buildPackageMetadata({
    template,
    packageName,
    description,
    keywords,
    templateConfig,
  });

  const packageExists = await checkPackageExists(metadata.packageDirectory);

  if (packageExists) {
    reportError(`Package "${metadata.scopedPackageName}" already exists.`);

    process.exit(EXIT_CODES.FAILURE);
  }

  await createPackageDirectory(metadata.packageDirectory);
  await copyBaseTemplate(metadata.packageDirectory);
  await generatePackage(metadata);

  reportSuccess(`Package "${metadata.scopedPackageName}" created successfully.`);
}

await main();
