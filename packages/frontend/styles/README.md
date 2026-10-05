# @beautinique/frontend-styles

Shared Tailwind v4 theme (colors, breakpoints, fonts), base styles, animations and utilities for the Beautinique frontends (`BQ-Client`, `BQ-Admin`, `BQ-Seller`, `BQ-Master`).

CSS only - no JavaScript. Tailwind in the consuming app processes it. The Metropolis font files (`woff2`) ship inside the package. `src/` is published as-is, there is no build output.

## Installation

```bash
npm install @beautinique/frontend-styles
```

Needs `tailwindcss` (^4) and `@tailwindcss/typography` (^0.5) in the app (peer dependencies).

## Usage

In the app's `src/index.css`:

```css
@import '@beautinique/frontend-styles';

/* The app's own css goes AFTER the package - later rules win. */
@import './app.css';
```

### Adding or overriding styles in one app

Everything the app writes after the import wins over the package, so each app can add or change things on its own:

```css
/* app.css */

/* Override a package CSS variable for this app only */
:root {
  --primary: #831843;
}

/* Add a new Tailwind token (becomes `bg-brand`, `text-brand`, ...) */
@theme {
  --color-brand: #be185d;
}

/* Change an existing token */
@theme {
  --breakpoint-xl: 1400px;
}

/* New app-only utility / component styles */
@utility app-glow {
  box-shadow: 0 0 24px rgb(var(--primary-rgb) / 0.3);
}
```

### Using only some parts

`index.css` imports the parts in a fixed order (it matters). If an app needs its own css **between** them, skip the all-in-one import and bring the parts yourself, in the same order:

```css
@import 'tailwindcss';
@plugin '@tailwindcss/typography';

@import '@beautinique/frontend-styles/variables.css';
@import './my-extra-tokens.css'; /* app css between the parts */
@import '@beautinique/frontend-styles/fonts.css';
@import '@beautinique/frontend-styles/global.css';
@import '@beautinique/frontend-styles/component.css';
@import '@beautinique/frontend-styles/animations.css';
@import '@beautinique/frontend-styles/utility.css';
```

| File                                              | What it is                                                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `variables.css`                                   | CSS variables and the Tailwind `@theme` (colors, breakpoints, font)                                        |
| `fonts.css`                                       | `@font-face` for Metropolis                                                                                |
| `global.css`                                      | base element styles                                                                                        |
| `component.css`                                   | shared component layer                                                                                     |
| `animations.css`                                  | keyframes/animation utilities                                                                              |
| `utility.css`                                     | custom `@utility` classes (gradient text, loading text, ...)                                               |
| `teddy.css`, `color-input.css`, `quill-input.css` | styles of specific components - not part of `index.css`, import them next to the component that needs them |

## Fonts

The Metropolis `woff2` files live in `src/fonts/metropolis/` and `fonts.css` references them relatively, so Vite bundles them with hashed file names - the app needs no `public/fonts` copy.

To preload one in `index.html`, use its path inside `node_modules` - Vite rewrites it to the hashed build file (same file the CSS uses):

```html
<link
  rel="preload"
  href="/node_modules/@beautinique/frontend-styles/src/fonts/metropolis/Metropolis-Regular.woff2"
  as="font"
  type="font/woff2"
  crossorigin="anonymous"
/>
```

An app with its own fonts can skip `fonts.css` and write its own `@font-face`.

## Things the app must provide

- **Scanning other packages:** when a package with Tailwind classes in its JS (e.g. a UI package) is installed, add it to the app's css so Tailwind sees the classes: `@source '../node_modules/@beautinique/frontend-ui/dist';`.
- **`quill`:** `quill-input.css` imports `quill/dist/quill.snow.css`, so an app that uses it must have `quill` installed.

## Local development

Install the package into an app from this repo as a **copy**, not a symlink:

```bash
npm install --install-links file:../BQ-Packages/packages/frontend/styles
```

A plain `file:` install is a symlink to the repo. The files then sit outside the app, so Vite's dev server answers `403` for the font files, and Tailwind IntelliSense in the editor cannot resolve `tailwindcss` from the package folder (no class suggestions). A copy behaves exactly like the published package. After changing the package, run the command again.

Run `npm run build` (it validates exports, imports and font paths) before publishing; `publish` does this too.

## Repository

https://github.com/Nageshwar1997/BQ-Packages

## Issues

https://github.com/Nageshwar1997/BQ-Packages/issues

## Author

Nageshwar Pawar
