import type { QuillToolbar } from './types.js';

/** The hosts an image may come from, other than this device, unless the editor is told others. */
export const DEFAULT_ALLOWED_IMAGE_HOSTS: readonly string[] = ['res.cloudinary.com'];

/** The `id` the link button of the toolbar gives a link (and takes off it again). */
export const DEFAULT_QUILL_LINK_ID = 'custom-link-btn';

/** Shown in an empty editor. */
export const DEFAULT_QUILL_PLACEHOLDER = 'Write your content here...';

/** The buttons of the toolbar unless the editor is given others. Do not change it: it is shared. */
export const DEFAULT_QUILL_TOOLBAR: QuillToolbar = [
  [{ header: [false, 6, 5, 4, 3, 2, 1] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  [{ direction: 'rtl' }],
  ['link', 'image', 'video'],
  ['code', 'clean'],
];

/** How long after the last change the headings get their `id`. */
export const HEADING_IDS_DELAY_MS = 200;
