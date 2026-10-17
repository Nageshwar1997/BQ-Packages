/*
 * The viewer: shows what the editor saved, safely. Nothing here imports `quill`, so an app that only
 * shows saved content does not load the editor (and does not need `quill` installed). The editor is
 * `@beautinique/frontend-quill/editor`.
 */
export { QuillContent, type QuillContentProps } from './viewer/QuillContent.js';
export { sanitizeQuillHtml } from './viewer/sanitize.js';
