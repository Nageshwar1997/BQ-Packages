import { execFile, spawn } from 'node:child_process';
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

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${filePath}`, {
      cause: error,
    });
  }
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
  try {
    const { stdout, stderr } = await execFileAsync(command, args, options);

    return {
      stdout: stdout.trimEnd(),
      stderr: stderr.trimEnd(),
    };
  } catch (error) {
    error.stdout = error.stdout?.trimEnd();
    error.stderr = error.stderr?.trimEnd();

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                           INTERACTIVE COMMAND                              */
/* -------------------------------------------------------------------------- */

/**
 * Runs an interactive command.
 *
 * @param {string} command
 * @param {string[]} [args=[]]
 * @param {import('node:child_process').SpawnOptions} [options={}]
 * @returns {Promise<void>}
 */
export function runInteractiveCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });

    child.on('error', reject);

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          code === null ? 'Command terminated unexpectedly.' : `Command exited with code ${code}.`,
        ),
      );
    });
  });
}
