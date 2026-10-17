import Quill from 'quill';

/** What `QuillImgBlot` writes into the editor for an image: its address, its text and its id. */
interface IQuillImageValue {
  src: string;
  alt?: string;
  id?: string;
}

/** The shape of Quill's own image format, which `import('formats/image')` gives untyped. */
interface IQuillImageBlot {
  new (): HTMLElement;
  create(value: unknown): HTMLElement;
  value(node: HTMLElement): unknown;
}

const BaseImage = Quill.import('formats/image') as IQuillImageBlot;

/**
 * Quill's image, with two additions: it keeps the `id` of an image picked in the editor in the
 * `data-image-id` attribute (so the editor can tell which of the held images are still in the text),
 * and it lets a `blob:` address through (Quill's own check would turn it into `about:blank`).
 */
export class QuillImgBlot extends BaseImage {
  static override create(value: string | IQuillImageValue) {
    const node = super.create(value) as HTMLImageElement;

    if (typeof value === 'string') {
      node.setAttribute('src', value);
    } else {
      node.setAttribute('src', value.src);
      node.setAttribute('alt', value.alt ?? 'Image');

      if (value.id !== undefined) {
        node.setAttribute('data-image-id', value.id);
      }
    }

    return node;
  }

  static override value(node: HTMLImageElement) {
    return {
      src: node.getAttribute('src'),
      alt: node.getAttribute('alt'),
      id: node.getAttribute('data-image-id'),
    };
  }

  static sanitize(url: string) {
    if (url.startsWith('blob:')) {
      return url;
    }

    // Quill's link check (http, https, mailto, tel, sms), the one this image always used
    const Link = Quill.import('formats/link') as { sanitize?: (url: string) => string } | undefined;

    return Link?.sanitize ? Link.sanitize(url) : url;
  }
}

/** Tells Quill about the image above (once; asking again does nothing). */
export const registerQuillFormats = () => {
  Quill.register('formats/image', QuillImgBlot, true);
};
