import { select } from "@inquirer/prompts";

/**
 * Prompts the user to select a package template.
 *
 * @returns {Promise<"shared" | "backend" | "frontend">}
 */
async function promptTemplate() {
  return select({
    message: "Select a package template",
    choices: [
      {
        name: "Shared",
        value: "shared",
        description: "Create a shared package",
      },
      {
        name: "Backend",
        value: "backend",
        description: "Create a backend package",
      },
      {
        name: "Frontend",
        value: "frontend",
        description: "Create a frontend package",
      },
    ],
  });
}

/**
 * Application entry point.
 */
async function main() {
  console.clear();

  console.log("✨ Beautinique Package Generator\n");

  const template = await promptTemplate();

  console.log("\nSelected Template:", template);
}

await main();
