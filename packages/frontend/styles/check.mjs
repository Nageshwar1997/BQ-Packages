// CSS-only package: `src/` is published as-is (nothing to compile - Tailwind/Vite in the consuming app
// processes these files), so there is no build output. The `build` and `typecheck` scripts both run this
// validation instead: CSS has no compiler to catch a typo, and `publish` always runs `build` first, so a
// broken path can't ship.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const problems = [];

// Comments are stripped first - css files document example imports (`./app.css`) that must not count.
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const isRelative = (path) => path.startsWith('./') || path.startsWith('../');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!pkg.files?.includes('src'))
  problems.push('package.json "files" must include "src" (it is what gets published)');
if (!pkg.style || !existsSync(resolve(root, pkg.style)))
  problems.push(`package.json "style" -> ${String(pkg.style)} is missing`);

// 1. Every `exports` target must exist.
const targets = Object.values(pkg.exports).flatMap((value) =>
  typeof value === 'string' ? [value] : Object.values(value),
);
for (const target of new Set(targets)) {
  if (!existsSync(resolve(root, target))) problems.push(`exports -> ${target}: file is missing`);
}

// 2. Every css file: relative `@import './x.css'` and relative `url(./font.woff2)` must resolve.
//    (Bare specifiers such as `url('quill/dist/quill.snow.css')` are the app's dependencies - not checked here.)
const cssFiles = readdirSync(src).filter((name) => name.endsWith('.css'));
for (const name of cssFiles) {
  const css = stripComments(readFileSync(join(src, name), 'utf8'));

  for (const [, , file] of css.matchAll(/@import\s+(['"])([^'"]+)\1/g)) {
    if (isRelative(file) && !existsSync(resolve(src, file)))
      problems.push(`${name} imports ${file}: file is missing`);
  }

  for (const [, , file] of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    if (isRelative(file) && !existsSync(resolve(src, file)))
      problems.push(`${name} uses url(${file}): file is missing`);
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(
  `frontend-styles: ${String(cssFiles.length)} css files, exports, imports and font urls all resolve`,
);
