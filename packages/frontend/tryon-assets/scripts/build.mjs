// This package has nothing to compile: it is models and images, no code. `build` is what the publish CLI
// runs before `npm publish`, so it is used for the one thing worth checking before the files go to npm:
// that they are all there. A version published without its models would be a 404 for every app that loads
// it from the CDN, and a version of the files never changes once it is published (the CDN keeps it for
// a year), so a mistake here would cost a new version.
//
// `node scripts/build.mjs [folder]` checks the folder (the package itself by default). It is not in the
// `files` of the package, so it is not published.
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
);

/** The files the try-on cannot start without. */
const REQUIRED_FILES = [
  'models/face_landmarker.task',
  'models/hand_landmarker.task',
  'models/hair_segmenter.tflite',
  'NOTICE.md',
  'README.md',
];

/** The folders of images the try-on reads from, each with at least one file. */
const REQUIRED_FOLDERS = [
  'images/eye',
  'images/lips',
  'images/models/face',
  'images/models/hair',
  'images/models/hand',
];

/** Every file under a folder, with its size. */
const filesUnder = (folder) =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(folder, entry.name);

    return entry.isDirectory() ? filesUnder(full) : [{ file: full, size: statSync(full).size }];
  });

// a set: the same file can be found by two of the checks below, and is said once
const problems = new Set();

for (const file of REQUIRED_FILES) {
  const full = path.join(root, file);

  if (!existsSync(full)) problems.add(`missing: ${file}`);
  else if (statSync(full).size === 0) problems.add(`empty: ${file}`);
}

for (const folder of REQUIRED_FOLDERS) {
  const full = path.join(root, folder);

  if (!existsSync(full)) problems.add(`missing folder: ${folder}`);
  else if (filesUnder(full).length === 0) problems.add(`no files in: ${folder}`);
}

for (const folder of ['models', 'images']) {
  const full = path.join(root, folder);

  if (!existsSync(full)) continue;

  for (const { file, size } of filesUnder(full)) {
    if (size === 0) problems.add(`empty: ${path.relative(root, file).replaceAll('\\', '/')}`);
  }
}

if (problems.size > 0) {
  console.error(`The files of the try-on assets are not complete (${root}):`);

  for (const problem of problems) console.error(`  - ${problem}`);

  process.exit(1);
}

const all = ['models', 'images'].flatMap((folder) => filesUnder(path.join(root, folder)));
const megabytes = all.reduce((sum, { size }) => sum + size, 0) / 1024 / 1024;

console.log(
  `Nothing to compile. ${String(all.length)} files (${megabytes.toFixed(1)} MB) are all there.`,
);
