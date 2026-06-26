import {
  promptDescription,
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

  console.log("\nPackage Details");
  console.log("───────────────");
  console.log(`Template     : ${template}`);
  console.log(`Package Name : ${packageName}`);
  console.log(`Description  : ${description}`);
}

await main();
