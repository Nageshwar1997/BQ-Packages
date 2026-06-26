import { input, select } from "@inquirer/prompts";
import { normalizeText } from "./utils.mjs";
import { validatePackageName } from "./validators.mjs";

/* -------------------------------------------------------------------------- */
/*                                   PROMPTS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to select a package template.
 *
 * @returns {Promise<"shared" | "backend" | "frontend">}
 */
export async function promptTemplate() {
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
export async function promptPackageName() {
  return normalizeText(
    await input({ message: "Package name", validate: validatePackageName }),
  );
}
