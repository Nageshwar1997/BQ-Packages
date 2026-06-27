import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/* -------------------------------------------------------------------------- */
/*                                   JSON                                     */
/* -------------------------------------------------------------------------- */

/**
 * Reads a JSON file.
 *
 * @template T
 * @param {string} filePath
 * @returns {Promise<T>}
 */
export async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content);
}

/**
 * Writes data to a JSON file.
 *
 * @param {string} filePath
 * @param {unknown} data
 * @returns {Promise<void>}
 */
export async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/* -------------------------------------------------------------------------- */
/*                                   PATH                                     */
/* -------------------------------------------------------------------------- */

/**
 * Checks whether a path exists.
 *
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
export async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);

    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                                  COMMAND                                   */
/* -------------------------------------------------------------------------- */

/**
 * Runs a command.
 *
 * @param {string} command
 * @param {string[]} [args=[]]
 * @param {import('node:child_process').ExecFileOptions} [options={}]
 * @returns {Promise<{
 *   stdout: string;
 *   stderr: string;
 * }>}
 */
export async function runCommand(command, args = [], options = {}) {
  const { stdout, stderr } = await execFileAsync(command, args, options);

  return { stdout: stdout.trim(), stderr: stderr.trim() };
}
