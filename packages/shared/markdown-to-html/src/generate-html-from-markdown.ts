import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { marked } from 'marked';

import { PAGE_STYLES } from './styles.js';
import type { IGenerateHtmlFromMarkdownOptions } from './types/index.js';

/**
 * Renders a Markdown file into a single, self-contained, GitHub-styled HTML
 * page (light/dark aware via `prefers-color-scheme`, no external requests)
 * and writes it to disk.
 *
 * Meant to run at build time (e.g. from a `postbuild`/`prebuild` script) so
 * a service can `res.sendFile` a pre-rendered page on every request instead
 * of re-parsing Markdown on every request.
 *
 * @example
 * ```ts
 * // scripts/generate-html.mjs, wired via this service's own "postbuild" script
 * import { generateHtmlFromMarkdown } from '@beautinique/shared-markdown-to-html';
 *
 * generateHtmlFromMarkdown({
 *   markdownPath: 'README.md',
 *   outputPath: 'public/index.html',
 *   title: 'Media Service',
 * });
 * ```
 */
export function generateHtmlFromMarkdown(options: IGenerateHtmlFromMarkdownOptions): void {
  const {
    markdownPath = 'README.md',
    outputPath = 'public/index.html',
    title,
    lang = 'en',
    extraStyles,
    cwd = process.cwd(),
  } = options;

  const markdownFilePath = resolve(cwd, markdownPath);
  const htmlFilePath = resolve(cwd, outputPath);

  const markdown = readFileSync(markdownFilePath, 'utf8');
  const body = marked.parse(markdown, { async: false });

  const html = `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>${PAGE_STYLES}${extraStyles ?? ''}</style>
  </head>
  <body>
    <main>${body}</main>
  </body>
</html>`;

  mkdirSync(dirname(htmlFilePath), { recursive: true });
  writeFileSync(htmlFilePath, html, 'utf8');
}
