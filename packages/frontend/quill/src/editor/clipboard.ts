import type { Delta } from 'quill';

/** The formats that carry a colour. A pasted text brings its own; the shop's colours are chosen with the toolbar. */
const PASTED_STYLE_FORMATS = ['color', 'background-color', 'background-image', 'background'];

/**
 * Takes the colours out of text that is pasted into the editor, so a copy from a web page or a
 * document does not bring its own look in. Changes `delta` and gives it back.
 */
export const removePastedStyles = (delta: Delta): Delta => {
  for (const op of delta.ops) {
    if (op.attributes) {
      op.attributes = Object.fromEntries(
        Object.entries(op.attributes).filter(([format]) => !PASTED_STYLE_FORMATS.includes(format)),
      );
    }
  }

  return delta;
};
