import createDOMPurify, { type DOMPurify } from 'dompurify';

/*
 * What the editor writes and the viewer shows is HTML that somebody else typed (a seller's product
 * description reaches every shopper who opens the page), so it is cleaned right before it reaches the
 * DOM, on the way in and on the way out, instead of trusting that it arrived clean. That holds whatever
 * Quill itself does: Quill has a known HTML-export gap (GHSA-v3m3-f69x-jf25, the formula and video
 * blots write their value into a string without escaping it), and the saved value can have been
 * changed by anyone who can reach the API.
 *
 * DOMPurify's own safe defaults already keep headings, lists, links, images, tables and the like.
 * `ADD_TAGS` / `ADD_ATTR` add just enough for the `video` button of the toolbar, which writes an
 * `<iframe>` with its size and playback attributes (DOMPurify still cleans the `src` of that iframe
 * like any other address and drops what is outside its list of safe protocols), and for the `target`
 * of a link.
 *
 * `FORBID_TAGS` takes out what DOMPurify lets through and the editor never writes: the controls of a
 * form. Text a seller typed has no use for a form, and a form in a product description (asking for a
 * card number, posting to another site) is how a shop page is used against its shoppers.
 */
const CONFIG = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allowfullscreen', 'frameborder', 'target'],
  FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'option', 'optgroup', 'datalist'],
};

/** What a link that opens a new tab needs so the page it opens cannot reach back into this one. */
const NEW_TAB_REL = 'noopener noreferrer';

/*
 * The package's own DOMPurify, not the shared one the app gets from `import DOMPurify from
 * 'dompurify'`: a hook added to the shared one would change what every other part of the app gets.
 * It is made on first use because it needs a `window`, which a server does not have.
 */
let purifier: DOMPurify | undefined;

const getPurifier = (): DOMPurify | undefined => {
  if (purifier === undefined) {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const created = createDOMPurify(window);

    // Quill writes `rel="noopener noreferrer"` itself, but a saved value can come without it: a
    // link that opens a new tab and keeps a way back into this page is how a page gets taken over.
    created.addHook('afterSanitizeAttributes', (node) => {
      if (node.hasAttribute('target') && node.getAttribute('target') !== '_self') {
        node.setAttribute('rel', NEW_TAB_REL);
      }
    });

    purifier = created;
  }

  return purifier;
};

/**
 * Cleans the HTML of the editor before it is written into a page or saved: scripts, event handlers,
 * `javascript:` addresses and the like are taken out, what Quill writes (headings, lists, links,
 * images, tables, the video `<iframe>`) stays, and a link that opens a new tab gets
 * `rel="noopener noreferrer"`.
 *
 * Where it cannot clean (there is no `window`: a server, a test without a DOM) it gives back an empty
 * string, never the HTML it was given. DOMPurify itself would hand the HTML back untouched there.
 *
 * @param html The HTML to clean.
 * @returns The clean HTML, or an empty string if it cannot be cleaned.
 */
export const sanitizeQuillHtml = (html: string): string => {
  const instance = getPurifier();

  if (!instance?.isSupported) {
    return '';
  }

  return instance.sanitize(html, CONFIG);
};
