// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { QuillContent } from './QuillContent.js';

afterEach(() => {
  unmountAll();
});

const boxOf = (container: HTMLElement) => container.firstElementChild as HTMLElement;

describe('QuillContent', () => {
  it('shows the content', () => {
    const view = mount(<QuillContent content="<h2>Title</h2><p>Some <strong>text</strong></p>" />);

    expect(boxOf(view.container).innerHTML).toBe('<h2>Title</h2><p>Some <strong>text</strong></p>');
  });

  it('cleans the content before it is shown', () => {
    const view = mount(
      <QuillContent
        content={
          '<p>a</p><img src="x" onerror="window.pwned = 1"><script>window.pwned = 1</script>'
        }
      />,
    );
    const box = boxOf(view.container);

    expect(box.querySelector('script')).toBeNull();
    expect(box.querySelector('img')?.hasAttribute('onerror')).toBe(false);
    expect(box.innerHTML).not.toContain('pwned');
  });

  it('shows the new content when it changes', () => {
    const view = mount(<QuillContent content="<p>one</p>" />);

    view.rerender(<QuillContent content="<p>two</p>" />);

    expect(boxOf(view.container).innerHTML).toBe('<p>two</p>');
  });

  it('empties the box when the content becomes empty (the old content must not stay)', () => {
    const view = mount(<QuillContent content="<p>one</p>" />);

    view.rerender(<QuillContent content="" />);

    expect(boxOf(view.container).innerHTML).toBe('');
  });

  it('has the look of the shop, and adds the classes it is given', () => {
    const view = mount(<QuillContent content="" className="lg:prose-sm!" />);
    const classes = boxOf(view.container).className.split(' ');

    expect(classes).toContain('prose');
    expect(classes).toContain('prose-headings:text-primary');
    expect(classes).toContain('w-full');
    expect(classes.at(-1)).toBe('lg:prose-sm!');
  });

  it('has no class of its own that no css defines', () => {
    const view = mount(<QuillContent content="" />);

    expect(boxOf(view.container).className).not.toContain('custom-prose');
  });

  it('passes the attributes of a div on to the box', () => {
    const view = mount(
      <QuillContent content="" id="details" data-testid="content" aria-label="Details" />,
    );
    const box = boxOf(view.container);

    expect(box.id).toBe('details');
    expect(box.getAttribute('data-testid')).toBe('content');
    expect(box.getAttribute('aria-label')).toBe('Details');
  });

  it('works under StrictMode (the effect runs twice)', () => {
    const view = mount(<QuillContent content="<p>once</p>" />, { strict: true });

    expect(boxOf(view.container).innerHTML).toBe('<p>once</p>');
  });
});
