import { IMAGE_FORMATS, IMAGE_MIMES, MAX_IMAGE_SIZE } from '@beautinique/frontend-constants';
import Quill, { Delta } from 'quill';
import { type ForwardedRef, forwardRef, useEffect, useRef, useState } from 'react';

import { sanitizeQuillHtml } from '../viewer/sanitize.js';
import { removePastedStyles } from './clipboard.js';
import {
  DEFAULT_ALLOWED_IMAGE_HOSTS,
  DEFAULT_QUILL_LINK_ID,
  DEFAULT_QUILL_PLACEHOLDER,
  DEFAULT_QUILL_TOOLBAR,
} from './constants.js';
import { createHeadingIds } from './heading-ids.js';
import { registerQuillFormats } from './image-blot.js';
import { hasForbiddenImage, insertImageIntoQuill } from './images.js';
import { addLinkIdButton, withoutImageButton } from './toolbar.js';
import type { QuillEditorProps } from './types.js';

/** What the editor writes for a text with nothing in it. */
const EMPTY_QUILL_HTML = '<p><br></p>';

/** The look of the box around the toolbar and the text (the rest of it is `quill-input.css` of the styles package). */
const BOX_CLASS_NAME =
  'custom-editor bg-smoke-eerie border-primary/10 text-primary w-full overflow-hidden rounded-lg border';

const TOOLBAR_LABEL = 'Text formatting';

/** Whether two pieces of HTML are the same text for the editor: equal, or both with nothing in them. */
const isSameContent = (a: string, b: string): boolean => {
  const isBlank = (html: string) => html === '' || html === EMPTY_QUILL_HTML;

  return a === b || (isBlank(a) && isBlank(b));
};

const assignRef = (ref: ForwardedRef<Quill | null>, quill: Quill | null) => {
  if (typeof ref === 'function') {
    ref(quill);
  } else if (ref) {
    ref.current = quill;
  }
};

/** Sets an attribute, or takes it off when there is no value. */
const setAttribute = (element: HTMLElement, name: string, value: string | undefined) => {
  if (value === undefined) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
};

/**
 * The rich-text editor: Quill with the toolbar of the shop, where an image that is picked stays on the
 * device (shown from a `blob:` address) until the content is saved with `processQuillContent`.
 *
 * It is only the box with the toolbar and the text: a label, a message about an error or a form
 * library are the page's, around it. Give the box a name with `aria-label` or `aria-labelledby`.
 *
 * Quill is made once, when the editor appears: `toolbar`, `linkIdButton` and the presence of
 * `imagesRef` are read then (give the editor another `key` to change them). Everything else can change
 * while it is there. The `ref` gives the Quill instance (`null` before it is made and after it is gone).
 *
 * It needs `@beautinique/frontend-styles/quill-input.css` in the app (the look of the toolbar and the
 * text), and `quill` installed. It runs in a browser: Quill needs a document, so on a server render it
 * only on the client.
 *
 * @example
 * <QuillEditor
 *   ref={quillRef}
 *   imagesRef={imagesRef}
 *   value={value}
 *   onChange={setValue}
 *   aria-labelledby="description-label"
 *   onError={(error) => toaster.error(describeQuillEditorError(error))}
 * />
 */
export const QuillEditor = forwardRef<Quill | null, QuillEditorProps>(
  function QuillEditor(props, ref) {
    const {
      value,
      onChange,
      placeholder = DEFAULT_QUILL_PLACEHOLDER,
      disabled = false,
      className,
      toolbar = DEFAULT_QUILL_TOOLBAR,
      imagesRef,
      linkIdButton = true,
      headingIds = true,
      allowedImageHosts = DEFAULT_ALLOWED_IMAGE_HOSTS,
      maxImageSize = MAX_IMAGE_SIZE,
      imageMimes = IMAGE_MIMES,
      imageFormats = IMAGE_FORMATS,
      onError,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      'aria-invalid': ariaInvalid,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);
    const headingIdsRef = useRef<ReturnType<typeof createHeadingIds> | null>(null);
    // The HTML the editor last reported through `onChange`: when `value` is only that, it is not set again
    const lastReportedRef = useRef<string | null>(null);

    // What the editor is made with: read once, when it appears
    const [initial] = useState(() => ({
      toolbar,
      placeholder,
      disabled,
      linkIdButton,
      hasImagesRef: imagesRef !== undefined,
    }));

    // What the handlers read when they run, so they always see the props of the last render and the
    // editor does not have to be made again when a function the page gives it is a new one
    const latest = useRef({
      onChange,
      onError,
      imagesRef,
      headingIds,
      allowedImageHosts,
      rules: { maxSize: maxImageSize, mimes: imageMimes, formats: imageFormats },
    });

    useEffect(() => {
      latest.current = {
        onChange,
        onError,
        imagesRef,
        headingIds,
        allowedImageHosts,
        rules: { maxSize: maxImageSize, mimes: imageMimes, formats: imageFormats },
      };
    });

    // Make the editor, once
    useEffect(() => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      registerQuillFormats();

      const editorElement = document.createElement('div');

      container.replaceChildren(editorElement);

      const quill = new Quill(editorElement, {
        theme: 'snow',
        placeholder: initial.placeholder,
        readOnly: initial.disabled,
        modules: {
          toolbar: {
            container: initial.hasImagesRef ? initial.toolbar : withoutImageButton(initial.toolbar),
            handlers: initial.hasImagesRef
              ? {
                  image: () => {
                    const { imagesRef: images, rules, onError: report } = latest.current;

                    if (images) {
                      insertImageIntoQuill(quill, images, rules, report);
                    }
                  },
                }
              : {},
          },
          clipboard: {
            matchVisual: true,
            matchers: [
              // A pasted image is not taken: images come in with the image button, to be uploaded on save
              ['IMG', () => new Delta()],
              // The colours of a pasted text are not taken
              [Node.ELEMENT_NODE, (_node: Node, delta: Delta) => removePastedStyles(delta)],
            ],
          },
        },
      });

      const toolbarElement = (quill.getModule('toolbar') as { container?: HTMLElement } | undefined)
        ?.container;

      // (Quill gives its toolbar `role="toolbar"` itself; what it lacks is a name)
      toolbarElement?.setAttribute('aria-label', TOOLBAR_LABEL);

      quill.root.setAttribute('role', 'textbox');
      quill.root.setAttribute('aria-multiline', 'true');

      const removeLinkIdButton = initial.linkIdButton
        ? addLinkIdButton(quill, DEFAULT_QUILL_LINK_ID)
        : undefined;

      const headings = createHeadingIds(quill);

      // The link tooltip would stay where it was while the text scrolls away from under it
      const hideTooltip = () => {
        (quill.theme as { tooltip?: { hide: () => void } }).tooltip?.hide();
      };

      quill.root.addEventListener('scroll', hideTooltip);

      quill.on('text-change', (delta, _oldDelta, source) => {
        const html = quill.root.innerHTML.trim();
        const { onChange: report, allowedImageHosts: hosts } = latest.current;

        lastReportedRef.current = html;
        report?.(html);

        if (latest.current.headingIds) {
          headings.schedule();
        }

        // Only what a person did is checked: the page loading a value is not
        if (source !== 'user') {
          return;
        }

        if (hasForbiddenImage(delta, hosts)) {
          latest.current.onError?.({ type: 'image-not-allowed' });
          quill.history.undo();
        }
      });

      quillRef.current = quill;
      headingIdsRef.current = headings;

      return () => {
        // (the listener on the text box goes with the text box, which is taken out of the page below)
        headings.cancel();
        removeLinkIdButton?.();

        // The images the person picked and did not save are let go of with the editor
        const images = latest.current.imagesRef?.current;

        if (images) {
          for (const image of images) {
            URL.revokeObjectURL(image.blobUrl);
          }

          images.length = 0;
        }

        quillRef.current = null;
        headingIdsRef.current = null;
        lastReportedRef.current = null;
        container.replaceChildren();
      };
    }, [initial]);

    // Give the instance to the ref of the page (and again if the page gives another ref)
    useEffect(() => {
      assignRef(ref, quillRef.current);

      return () => {
        assignRef(ref, null);
      };
    }, [ref]);

    // Show a value that comes from outside (a saved draft, a form that was reset)
    useEffect(() => {
      const quill = quillRef.current;

      // Only what the editor itself just reported came back: nothing to show
      if (!quill || value === lastReportedRef.current) {
        return;
      }

      // `value` can be a record saved earlier and opened again, not only what was typed here: it is
      // cleaned before it lands in the editable DOM. Both sides go through the same cleaning, so a
      // harmless difference in how it is written is not taken for a change.
      const next = value ? sanitizeQuillHtml(value) : '';

      if (isSameContent(next, sanitizeQuillHtml(quill.root.innerHTML))) {
        return;
      }

      // Set on the DOM, not through Quill's clipboard (its matchers would take the images out), and
      // then Quill is told to read it now and keep quiet: the page set this value, so it is not a
      // change to report, and it is not a person adding an image that has to be checked.
      quill.root.innerHTML = next;
      quill.update('silent');

      if (latest.current.headingIds) {
        headingIdsRef.current?.schedule();
      }
    }, [value]);

    useEffect(() => {
      quillRef.current?.enable(!disabled);
    }, [disabled]);

    useEffect(() => {
      const quill = quillRef.current;

      if (quill) {
        quill.root.setAttribute('data-placeholder', placeholder);
      }
    }, [placeholder]);

    // Tell assistive technology what the text box is
    useEffect(() => {
      const root = quillRef.current?.root;

      if (!root) {
        return;
      }

      setAttribute(root, 'aria-label', ariaLabel);
      setAttribute(root, 'aria-labelledby', ariaLabelledby);
      setAttribute(root, 'aria-describedby', ariaDescribedby);
      setAttribute(
        root,
        'aria-invalid',
        ariaInvalid === undefined ? undefined : String(ariaInvalid),
      );
      setAttribute(root, 'aria-readonly', disabled ? 'true' : undefined);
    }, [ariaLabel, ariaLabelledby, ariaDescribedby, ariaInvalid, disabled]);

    return (
      <div
        ref={containerRef}
        className={className ? `${BOX_CLASS_NAME} ${className}` : BOX_CLASS_NAME}
      />
    );
  },
);
