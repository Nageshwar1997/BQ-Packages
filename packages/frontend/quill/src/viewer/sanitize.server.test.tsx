// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { QuillContent } from './QuillContent.js';
import { sanitizeQuillHtml } from './sanitize.js';

// On a server there is no `window`, and DOMPurify cannot clean anything there: it hands the HTML back
// untouched. The package must not do that.
describe('sanitizeQuillHtml without a window (a server)', () => {
  it('has no window here', () => {
    expect(typeof window).toBe('undefined');
  });

  it('gives back an empty string, not the HTML it could not clean', () => {
    expect(sanitizeQuillHtml('<img src=x onerror=alert(1)>')).toBe('');
    expect(sanitizeQuillHtml('<p>harmless</p>')).toBe('');
  });

  it('does not throw', () => {
    expect(() => sanitizeQuillHtml('<script>x()</script>')).not.toThrow();
  });
});

describe('QuillContent rendered on a server', () => {
  it('renders the box and none of the content (it is written on the client, after it is cleaned)', () => {
    const html = renderToString(<QuillContent content="<p>secret</p><script>x()</script>" />);

    expect(html).toMatch(/^<div class="prose /);
    expect(html).not.toContain('secret');
    expect(html).not.toContain('script');
  });
});
