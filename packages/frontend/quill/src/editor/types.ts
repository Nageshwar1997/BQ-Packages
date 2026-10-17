import type { ToolbarConfig } from 'quill/modules/toolbar';
import type { ComponentPropsWithoutRef, RefObject } from 'react';

/** An image that was picked in the editor and is still on this device (it is uploaded on save). */
export interface QuillImageRef {
  id: string;
  file: File;
  /** The `blob:` address the editor shows the image from until it is uploaded. */
  blobUrl: string;
}

/** What goes in the toolbar of the editor: Quill's own format (a list of groups of buttons). */
export type QuillToolbar = ToolbarConfig;

/**
 * Something the editor did not allow, with what a message needs. `describeQuillEditorError` turns it
 * into a title and a description.
 *
 * - `image-too-large`: the picked image is bigger than `maxImageSize`;
 * - `image-invalid-type`: the picked file is not one of the image types that are allowed;
 * - `image-not-allowed`: an image was dragged, dropped or pasted in, or comes back by an undo, from
 *   somewhere other than the upload button. It was taken out again.
 */
export type QuillEditorError =
  | { type: 'image-too-large'; file: File; size: number; maxSize: number }
  | {
      type: 'image-invalid-type';
      file: File;
      /** The extension of the file name in lower case, `undefined` if it has none. */
      extension: string | undefined;
      allowedFormats: readonly string[];
    }
  | { type: 'image-not-allowed' };

export interface QuillEditorProps extends Pick<
  ComponentPropsWithoutRef<'div'>,
  'aria-label' | 'aria-labelledby' | 'aria-describedby'
> {
  /**
   * The HTML to show. Cleaned before it is written into the editor. A change that is only what the
   * editor itself just reported through `onChange` is ignored, so the cursor stays where it is.
   */
  value?: string;
  /** The HTML of the editor after every change (what the person typed, or an undo). */
  onChange?: (html: string) => void;
  /** Shown while the editor is empty. Default: `Write your content here...`. */
  placeholder?: string;
  /** Not editable (the toolbar stays but does nothing). */
  disabled?: boolean;
  /** Tells the person the content is not valid (`aria-invalid`). */
  'aria-invalid'?: boolean;
  /** Classes of the box around the toolbar and the text. */
  className?: string;
  /**
   * The buttons of the toolbar, in Quill's format. Read once, when the editor is made: to change it,
   * give the editor another `key`. Default: `DEFAULT_QUILL_TOOLBAR`.
   */
  toolbar?: QuillToolbar;
  /**
   * Where the images picked with the image button are held until they are uploaded. Give the same
   * ref to `processQuillContent`. Without it the editor has no way to hold an image, so the image
   * button is left out of the toolbar. An image deleted from the text stays here (an undo brings it back);
   * what is held is let go of when the content is saved or the editor goes away.
   */
  imagesRef?: RefObject<QuillImageRef[]>;
  /** Adds the button that gives the selected link an `id` (`DEFAULT_QUILL_LINK_ID`) or takes it off. Default: `true`. */
  linkIdButton?: boolean;
  /** Gives every heading an `id` (so a page can link to it). Default: `true`. */
  headingIds?: boolean;
  /** The hosts an image may come from other than this device. Default: `DEFAULT_ALLOWED_IMAGE_HOSTS`. */
  allowedImageHosts?: readonly string[];
  /** The biggest image in bytes. Default: `MAX_IMAGE_SIZE` of `@beautinique/frontend-constants`. */
  maxImageSize?: number;
  /** The image types (MIME) that may be picked. Default: `IMAGE_MIMES` of `@beautinique/frontend-constants`. */
  imageMimes?: readonly string[];
  /** The file extensions that may be picked. Default: `IMAGE_FORMATS` of `@beautinique/frontend-constants`. */
  imageFormats?: readonly string[];
  /** Called when the editor does not allow something (see `QuillEditorError`). It shows nothing itself. */
  onError?: (error: QuillEditorError) => void;
}
