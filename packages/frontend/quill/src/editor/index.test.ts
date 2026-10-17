// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import * as editor from './index.js';

// What `/editor` really gives once it is loaded (src/api.test.ts reads the same list from the text of
// the file, because the editor needs a document to load and that test has none).
describe('/editor, loaded', () => {
  it('gives exactly these values', () => {
    expect(Object.keys(editor).sort()).toEqual([
      'DEFAULT_ALLOWED_IMAGE_HOSTS',
      'DEFAULT_QUILL_LINK_ID',
      'DEFAULT_QUILL_PLACEHOLDER',
      'DEFAULT_QUILL_TOOLBAR',
      'QuillEditor',
      'QuillUploadCountError',
      'describeQuillEditorError',
      'getQuillContent',
      'getQuillImageFiles',
      'getQuillImagesInText',
      'processQuillContent',
    ]);
  });

  it('gives each value the kind it has to be', () => {
    expect(typeof editor.QuillEditor).toBe('object'); // forwardRef
    expect(typeof editor.processQuillContent).toBe('function');
    expect(typeof editor.getQuillContent).toBe('function');
    expect(typeof editor.getQuillImageFiles).toBe('function');
    expect(typeof editor.describeQuillEditorError).toBe('function');
    expect(typeof editor.QuillUploadCountError).toBe('function');
    expect(Array.isArray(editor.DEFAULT_QUILL_TOOLBAR)).toBe(true);
    expect(editor.DEFAULT_ALLOWED_IMAGE_HOSTS).toEqual(['res.cloudinary.com']);
    expect(editor.DEFAULT_QUILL_LINK_ID).toBe('custom-link-btn');
    expect(editor.DEFAULT_QUILL_PLACEHOLDER).toBe('Write your content here...');
  });
});
