import {
  promptConfirmation,
  promptDescription,
  promptKeywords,
  promptPackageName,
  promptTemplate,
} from "./prompts.mjs";

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
}

await main();
