import { copyBaseTemplate } from "./generators/copy-template.mjs";
import { generatePackageJson } from "./generators/package-json.mjs";
import { buildPackageMetadata } from "./metadata.mjs";
import { checkPackageExists, createPackageDirectory } from "./package.mjs";
import {
  promptConfirmation,
  promptDescription,
  promptKeywords,
  promptPackageName,
  promptTemplate,
} from "./prompts.mjs";
import { loadTemplate } from "./template.mjs";

/* -------------------------------------------------------------------------- */
/*                                    MAIN                                    */
/* -------------------------------------------------------------------------- */

/**
 * Starts the package generator.
 */
async function main() {
  console.clear();

  console.log("✨ Beautinique Package Generator\n");

  const template = await promptTemplate();
  const packageName = await promptPackageName();
  const description = await promptDescription();
  const keywords = await promptKeywords();

  console.log("\nPackage Details");
  console.log("───────────────");
  console.log(`Template     : ${template}`);
  console.log(`Package Name : ${packageName}`);
  console.log(`Description  : ${description}`);
  console.log(`Keywords     : ${keywords.join(", ")}`);

  const confirmed = await promptConfirmation();

  if (!confirmed) {
    console.log("\n❌ Package creation cancelled.");
    return;
  }

  const templateConfig = await loadTemplate(template);

  console.log(templateConfig);


  const metadata = buildPackageMetadata({
    template,
    packageName,
    description,
    keywords,
    templateConfig,
  });

  console.log(metadata);

  const packageExists = await checkPackageExists(metadata);

  if (packageExists) {
    console.error(
      `\n❌ Package "${metadata.scopedPackageName}" already exists.`,
    );

    process.exit(1);
  }

  await createPackageDirectory(metadata);

  console.log(`\n✅ Created package directory:\n${metadata.packageDirectory}`);

  await copyBaseTemplate(metadata);

  await generatePackageJson(metadata);

  console.log("\n✅ Base template copied successfully.");
}

await main();
