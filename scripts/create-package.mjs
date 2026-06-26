import { input, select } from "@inquirer/prompts";

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const PACKAGE_NAME_REGEX = /^[a-z][a-z0-9-]*$/;

/* -------------------------------------------------------------------------- */
/*                                 VALIDATORS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Validates the package name.
 *
 * Rules:
 *  • Required
 *  • Must start with a lowercase letter
 *  • Can contain lowercase letters, numbers, and hyphens
 *
 * @param {string} value
 * @returns {true | string}
 */
function validatePackageName(value) {
  if (!value) {
    return "Package name is required.";
  }

  if (!PACKAGE_NAME_REGEX.test(value)) {
    return "Package name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.";
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/*                                   PROMPTS                                  */
/* -------------------------------------------------------------------------- */

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
 * Prompts the user to enter a package name.
 *
 * @returns {Promise<string>}
 */
async function promptPackageName() {
  return input({
    message: "Package name",
    validate: validatePackageName,
  });
}

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

  console.log("\nSelected Template:", template);
  console.log("Package Name:", packageName);
}

await main();
