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
  console.clear();

  console.log('✨ Beautinique Package Generator\n');

  const template = await promptTemplate();
  const packageName = await promptPackageName();
  const description = await promptDescription();
  const keywords = await promptKeywords();

  console.log('\nPackage Details');
  console.log('───────────────');
  console.log(`Template     : ${template}`);
  console.log(`Package Name : ${packageName}`);
  console.log(`Description  : ${description}`);
  console.log(`Keywords     : ${keywords.join(', ')}`);

  const confirmed = await promptConfirmation();

  if (!confirmed) {
    console.log('\n❌ Package creation cancelled.');
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

  const packageExists = await checkPackageExists(metadata);

  if (packageExists) {
    console.error(`\n❌ Package "${metadata.scopedPackageName}" already exists.`);

    process.exit(1);
  }

  await createPackageDirectory(metadata);
  await copyBaseTemplate(metadata);
  await generatePackage(metadata);

  console.log(`\n✅ Package "${metadata.scopedPackageName}" created successfully.`);
}

await main();
