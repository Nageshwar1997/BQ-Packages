import inquirer from 'inquirer';
import { exec, spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import { JsonError } from '../common/errors.mjs';
import { COMMON_ACTIONS, EXIT_CODES } from './constants.mjs';

/**
 * @import { ExecOptions, SpawnOptions } from 'node:child_process'
 */

const execAsync = promisify(exec);

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Escapes a shell argument.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeShellArgument(value) {
  if (/^[a-zA-Z0-9_./:@=-]+$/.test(value)) {
    return value;
  }

  if (process.platform === 'win32') {
    return `"${value.replaceAll('"', '\\"')}"`;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}

/**
 * Builds a command string.
 *
 * @param {string} command
 * @param {string[]} args
 * @returns {string}
 */
function buildCommand(command, args) {
  return [command, ...args.map(escapeShellArgument)].join(' ');
}

/**
 * Parses JSON data.
 *
 * @param {string} data
 * @returns {Promise<unknown>}
 */
export function parseData(data) {
  try {
    return JSON.parse(data);
  } catch {
    throw new JsonError(`Failed to parse JSON: ${data}`);
  }
}

/**
 * Reads a file by path.
 *
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export async function readFileByPath(filePath) {
  return await readFile(filePath, 'utf8');
}

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
  const content = await readFileByPath(filePath);

  try {
    return parseData(content);
  } catch {
    throw new JsonError(`Failed to parse JSON: ${filePath}`);
  }
}

/**
 * Writes data to a JSON file.
 *
 * @param {string} filePath
 * @param {unknown} data
 * @param {{
 *   indent?: string | number;
 *   trailingNewline?: boolean;
 * }} [options={}]
 * @returns {Promise<void>}
 */
export async function writeJson(filePath, data, options = {}) {
  const { indent = 2, trailingNewline = true } = options;

  await writeFile(
    filePath,
    `${JSON.stringify(data, null, indent)}${trailingNewline ? '\n' : ''}`,
    'utf8',
  );
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
 * Runs a command and captures stdout/stderr.
 *
 * @param {string} command
 * @param {string[]} [args=[]]
 * @param {ExecOptions} [options={}]
 * @returns {Promise<{
 *   stdout: string;
 *   stderr: string;
 * }>}
 */
export async function runCommand(command, args = [], options = {}) {
  try {
    const { stdout, stderr } = await execAsync(buildCommand(command, args), {
      ...options,
      windowsHide: true,
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    /** @type {Error & { stdout?: string; stderr?: string }} */
    const commandError = error;

    throw new Error(
      commandError.stderr?.trim() || commandError.stdout?.trim() || commandError.message,
    );
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
 * @param {SpawnOptions} [options={}]
 * @returns {Promise<void>}
 */
export function runInteractiveCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    /*
     * Pre-joins command + args into a single, pre-escaped string (the same
     * helper `runCommand` uses) instead of passing `args` as a separate
     * array alongside `shell: true` - Node deprecates that combination
     * (DEP0190) because it does its own unescaped concatenation internally.
     */
    const child = spawn(buildCommand(command, args), {
      ...options,
      stdio: 'inherit',
      shell: true,
      windowsHide: true,
    });

    child.once('error', reject);

    child.once('close', (code) => {
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
/**
 * Gets common choices.
 * @param {string | null} username
 * @returns
 */

export function getCommonChoices(username) {
  return [
    new inquirer.Separator(),
    { name: 'Package Status', value: COMMON_ACTIONS.STATUS },
    ...(username
      ? [{ name: `Logout (${username})`, value: COMMON_ACTIONS.LOGOUT }]
      : [{ name: 'Login', value: COMMON_ACTIONS.LOGIN }]),
    new inquirer.Separator(),
    { name: 'Exit', value: COMMON_ACTIONS.EXIT },
  ];
}

/**
 * Exits the process.
 *
 * @param {number} [code=EXIT_CODES.SUCCESS]
 * @returns {never}
 */
export function exit(code = EXIT_CODES.SUCCESS) {
  process.exit(code);
}
