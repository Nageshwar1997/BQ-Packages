export interface IGenerateHtmlFromMarkdownOptions {
  /** Path to the source Markdown file. @default 'README.md' */
  markdownPath?: string;
  /** Path to write the generated HTML file to - parent directories are created if missing. @default 'public/docs.html' */
  outputPath?: string;
  /** `<title>` of the generated page. */
  title: string;
  /** `<html lang="...">`. @default 'en' */
  lang?: string;
  /** Extra CSS appended after the built-in page styles (e.g. to override a color or add branding). */
  extraStyles?: string;
  /** Directory `markdownPath`/`outputPath` are resolved against. @default process.cwd() */
  cwd?: string;
}
