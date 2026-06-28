import { whoami } from './npm.mjs';

/* -------------------------------------------------------------------------- */
/*                              AUTHENTICATION                                */
/* -------------------------------------------------------------------------- */

/**
 * Ensures the user is logged in to npm.
 *
 * @returns {Promise<string>}
 */
export async function ensureLoggedIn() {
  const username = await whoami();

  if (!username) {
    throw new Error('Please login to npm before continuing.');
  }

  return username;
}

/**
 * Ensures the user is logged out of npm.
 *
 * @returns {Promise<void>}
 */
export async function ensureLoggedOut() {
  const username = await whoami();

  if (username) {
    throw new Error(`Already logged in as "${username}".`);
  }
}
