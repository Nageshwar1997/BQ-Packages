import { whoami } from './npm.mjs';

/**
 * Creates an expected error.
 *
 * @param {string} message
 * @returns {Error & { expected: true }}
 */
function createExpectedError(message) {
  const error = new Error(message);

  error.expected = true;

  return error;
}

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
    throw createExpectedError('Please login to npm before continuing.');
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
    throw createExpectedError(`Already logged in as "${username}".`);
  }
}
