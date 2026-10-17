// @vitest-environment jsdom
import DOMPurify from 'dompurify';
import { describe, expect, it } from 'vitest';

import { sanitizeQuillHtml } from './sanitize.js';

/** The element a piece of HTML makes, to look at what is in it. */
const parse = (html: string) => {
  const host = document.createElement('div');

  host.innerHTML = html;

  return host;
};

describe('sanitizeQuillHtml: what is taken out', () => {
  it.each([
    ['a script', '<p>a</p><script>window.pwned = 1</script>'],
    ['an event handler on an image', '<img src="x" onerror="window.pwned = 1">'],
    ['an event handler on a link', '<a href="https://shop.test" onclick="window.pwned = 1">a</a>'],
    ['a javascript: address', '<a href="javascript:window.pwned=1">a</a>'],
    ['a javascript: address in different letters', '<a href="JaVaScRiPt:window.pwned=1">a</a>'],
    ['a javascript: iframe', '<iframe src="javascript:window.pwned=1"></iframe>'],
    ['an svg that runs on load', '<svg onload="window.pwned = 1"><circle r="1"></circle></svg>'],
    ['an object', '<object data="https://evil.test/x.swf"></object>'],
    ['a form', '<form action="https://evil.test"><input name="card"><button>Pay</button></form>'],
    [
      'a field outside a form',
      '<input name="card"><textarea>x</textarea><select><option>a</option></select>',
    ],
    ['a style tag', '<style>body { display: none }</style><p>a</p>'],
  ])('takes out %s', (_name, html) => {
    const clean = sanitizeQuillHtml(html);
    const host = parse(clean);

    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).not.toMatch(/\bon[a-z]+\s*=/i);
    expect(
      host.querySelector('script, object, form, input, button, textarea, select, style'),
    ).toBeNull();
    // an iframe or an svg may stay, but never with anything that runs
    expect(host.querySelector('iframe[src^="javascript" i]')).toBeNull();
  });

  it('keeps the text that was around what it took out', () => {
    expect(sanitizeQuillHtml('<p>before</p><script>x()</script><p>after</p>')).toBe(
      '<p>before</p><p>after</p>',
    );
  });
});

describe('sanitizeQuillHtml: what is kept', () => {
  it('keeps what the editor writes', () => {
    const html =
      '<h2 id="a1">Title</h2><p>Some <strong>bold</strong>, <em>italic</em>, <u>underlined</u> and <s>struck</s> text with <code>code</code>.</p>' +
      '<ul><li>one</li></ul><ol><li>two</li></ol><blockquote>quote</blockquote>' +
      '<p class="ql-align-center ql-indent-1">centered</p>' +
      '<p><img src="https://res.cloudinary.com/shop/a.png" alt="A" data-image-id="i1"></p>' +
      '<table><tbody><tr><td>cell</td></tr></tbody></table>';

    expect(sanitizeQuillHtml(html)).toBe(html);
  });

  it('keeps a link and where it opens', () => {
    const link = parse(
      sanitizeQuillHtml('<a href="https://shop.test/a" target="_blank">a</a>'),
    ).querySelector('a');

    expect(link?.getAttribute('href')).toBe('https://shop.test/a');
    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('keeps the video the toolbar embeds, with its size and playback attributes', () => {
    const iframe = parse(
      sanitizeQuillHtml(
        '<iframe class="ql-video" frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/abc"></iframe>',
      ),
    ).querySelector('iframe');

    expect(iframe?.getAttribute('src')).toBe('https://www.youtube.com/embed/abc');
    expect(iframe?.getAttribute('allowfullscreen')).toBe('true');
    expect(iframe?.getAttribute('frameborder')).toBe('0');
    expect(iframe?.className).toBe('ql-video');
  });

  it('gives back an empty string for an empty one', () => {
    expect(sanitizeQuillHtml('')).toBe('');
  });
});

describe('sanitizeQuillHtml: links that open a new tab', () => {
  it('gives them rel="noopener noreferrer", also when the saved value came without it', () => {
    const link = parse(
      sanitizeQuillHtml('<a href="https://evil.test" target="_blank" rel="opener">a</a>'),
    ).querySelector('a');

    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('leaves a link that stays on the page as it is', () => {
    const plain = parse(sanitizeQuillHtml('<a href="https://shop.test">a</a>')).querySelector('a');
    const self = parse(
      sanitizeQuillHtml('<a href="https://shop.test" target="_self">a</a>'),
    ).querySelector('a');

    expect(plain?.hasAttribute('rel')).toBe(false);
    expect(self?.hasAttribute('rel')).toBe(false);
  });

  it('does that without changing the DOMPurify the app itself uses', () => {
    // The hook belongs to the package's own instance: the app's `DOMPurify.sanitize` is the same as before
    const apps = parse(
      DOMPurify.sanitize('<a href="https://shop.test" target="_blank">a</a>', {
        ADD_ATTR: ['target'],
      }),
    ).querySelector('a');

    expect(apps?.hasAttribute('rel')).toBe(false);
  });
});
