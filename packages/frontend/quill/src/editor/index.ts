/*
 * The editor: Quill with the toolbar of the shop, and the images held back until the content is saved.
 * It needs `quill` (a peer dependency) and a browser. Showing what it saved needs none of this: that is
 * the root of the package (`@beautinique/frontend-quill`), which never imports `quill`.
 */
export {
  DEFAULT_ALLOWED_IMAGE_HOSTS,
  DEFAULT_QUILL_LINK_ID,
  DEFAULT_QUILL_PLACEHOLDER,
  DEFAULT_QUILL_TOOLBAR,
} from './constants.js';
export { describeQuillEditorError } from './errors.js';
export { getQuillImageFiles, getQuillImagesInText } from './images.js';
export {
  getQuillContent,
  processQuillContent,
  type ProcessQuillContentOptions,
  QuillUploadCountError,
} from './process-content.js';
export { QuillEditor } from './QuillEditor.js';
export type { QuillEditorError, QuillEditorProps, QuillImageRef, QuillToolbar } from './types.js';
