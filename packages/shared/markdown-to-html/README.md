# @beautinique/shared-markdown-to-html

Renders a Markdown file (typically a service's own `README.md`) into a single, self-contained, GitHub-styled HTML page (light/dark aware, no external requests) at build time.

## Installation

```bash
npm install @beautinique/shared-markdown-to-html
```

## Usage

Call `generateHtmlFromMarkdown` from a small build-time script in the consuming service, and wire that script into the service's own `postbuild` (or `predev`) npm script - not into request-handling code. This way the HTML is generated once, at build time, and the server just serves the static file on every request instead of re-parsing Markdown per request:

```js
// scripts/generate-html.mjs
import { generateHtmlFromMarkdown } from '@beautinique/shared-markdown-to-html';

generateHtmlFromMarkdown({
  markdownPath: 'README.md', // default
  outputPath: 'public/index.html', // default
  title: 'Media Service', // required - no sensible default across services
});
```

```json
// package.json
{
  "scripts": {
    "build": "tsc",
    "postbuild": "node scripts/generate-html.mjs"
  }
}
```

Then in the server:

```ts
app.get('/', (_req, res) => {
  res.sendFile(path.resolve('public/index.html'));
});
```

| Option        | Default             | Description                                                                 |
| ------------- | -------------------- | ------------------------------------------------------------------------------ |
| `markdownPath` | `'README.md'`         | Path to the source Markdown file, resolved against `cwd`.                     |
| `outputPath`   | `'public/index.html'` | Path to write the generated HTML file to - parent directories are created if missing, resolved against `cwd`. |
| `title`        | _(required)_          | `<title>` of the generated page - no sensible default shared across services. |
| `lang`         | `'en'`                | `<html lang="...">`.                                                          |
| `extraStyles`  | `undefined`           | Extra CSS appended after the built-in page styles (e.g. to override a color or add branding). |
| `cwd`          | `process.cwd()`       | Directory both paths above are resolved against.                             |

## Using this in a frontend (Vite/React) app

This package itself only ever runs in Node.js (it reads/writes files via `node:fs`) - never import `generateHtmlFromMarkdown` into browser-bundled source (anything under `src/` that Vite ships to the client). Wire it into the app's own build-time scripts instead, exactly like a backend service:

```js
// scripts/generate-html.mjs
import { generateHtmlFromMarkdown } from '@beautinique/shared-markdown-to-html';

generateHtmlFromMarkdown({
  markdownPath: 'README.md',
  outputPath: 'public/docs.html', // see warning below - don't use 'public/index.html'
  title: 'My App Docs',
});
```

```json
// package.json
{
  "scripts": {
    "predev": "node scripts/generate-html.mjs",
    "dev": "vite",
    "build": "vite build",
    "postbuild": "node scripts/generate-html.mjs"
  }
}
```

Anything inside Vite's `public/` directory is served as-is, unprocessed, at the matching URL path - in both `vite dev` and after `vite build`. So once `public/docs.html` exists, it's reachable at `/docs.html`, and can be shown inside the app with a plain `iframe` - no need to import this package (or touch `node:fs`) from any browser code at all:

```tsx
function DocsPage() {
  return <iframe src="/docs.html" title="Docs" style={{ width: '100%', height: '100vh', border: 'none' }} />;
}
```

**Don't set `outputPath` to `public/index.html`** in a Vite app - Vite's own SPA entry point is an `index.html` (conventionally at the project root, sometimes copied into `public/`), containing the `<script type="module">` tag that boots the app. Overwriting it with this package's rendered Markdown page would break the app entirely. Pick a distinct filename (`public/docs.html`, `public/readme.html`, etc.) instead.

## Repository

https://github.com/Nageshwar1997/BQ-Packages

## Homepage

https://github.com/Nageshwar1997/BQ-Packages

## Issues

https://github.com/Nageshwar1997/BQ-Packages/issues

## Author

Nageshwar Pawar

## License

This package is licensed under the MIT License. See the root `LICENSE` file for details.
