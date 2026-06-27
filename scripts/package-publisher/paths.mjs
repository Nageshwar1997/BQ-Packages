import path from 'node:path';

export const ROOT_DIRECTORY = process.cwd();

export const PACKAGES_DIRECTORY = path.join(ROOT_DIRECTORY, 'packages');

export function getPackageJsonPath(packageDirectory) {
  return path.join(packageDirectory, 'package.json');
}

export function getReadmePath(packageDirectory) {
  return path.join(packageDirectory, 'README.md');
}

export function getLicensePath(packageDirectory) {
  return path.join(packageDirectory, 'LICENSE');
}