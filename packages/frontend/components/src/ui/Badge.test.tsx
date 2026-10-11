// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { Badge } from './Badge.js';

const badgeOf = (container: HTMLElement) => container.querySelector('span');

describe('Badge', () => {
  afterEach(() => {
    unmountAll();
  });

  describe('what it shows', () => {
    it('shows text', () => {
      const view = mount(<Badge content="New" />);

      expect(badgeOf(view.container)?.textContent).toBe('New');
    });

    it('shows a number, also 0', () => {
      const view = mount(<Badge content={0} />);

      expect(badgeOf(view.container)?.textContent).toBe('0');
    });

    it('shows any React content: an element, a few elements, an icon', () => {
      const view = mount(
        <Badge
          content={
            <>
              <svg data-testid="icon" />
              <b>Pro</b>
            </>
          }
        />,
      );
      const badge = badgeOf(view.container);

      expect(badge?.querySelector('svg[data-testid="icon"]')).not.toBeNull();
      expect(badge?.querySelector('b')?.textContent).toBe('Pro');
    });

    it.each([null, undefined, false, true, ''])('renders nothing at all for %j', (content) => {
      const view = mount(<Badge content={content} />);

      expect(view.container.innerHTML).toBe('');
    });

    it('does not turn `content` into an attribute of the span', () => {
      const view = mount(<Badge content="New" />);

      expect(badgeOf(view.container)?.hasAttribute('content')).toBe(false);
    });
  });

  describe('its look', () => {
    it('is a rounded pill', () => {
      const view = mount(<Badge content="New" />);
      const classes = badgeOf(view.container)?.className ?? '';

      for (const own of ['rounded-full', 'inline-flex', 'border', 'px-2.5', 'py-1', 'text-xs']) {
        expect(classes.split(' '), own).toContain(own);
      }
    });

    it('adds the classes it is given after its own', () => {
      const view = mount(<Badge content="New" className="bg-red-500 ml-2" />);
      const classes = badgeOf(view.container)?.className.split(/\s+/) ?? [];

      expect(classes).toContain('bg-red-500');
      expect(classes.indexOf('bg-red-500')).toBeGreaterThan(classes.indexOf('rounded-full'));
    });
  });

  describe('the span', () => {
    it('gets the attributes it is given', () => {
      const view = mount(
        <Badge
          content="3"
          id="count"
          title="3 unread"
          role="status"
          aria-label="3 unread"
          data-testid="b"
        />,
      );
      const badge = badgeOf(view.container);

      expect(badge?.id).toBe('count');
      expect(badge?.title).toBe('3 unread');
      expect(badge?.getAttribute('role')).toBe('status');
      expect(badge?.getAttribute('aria-label')).toBe('3 unread');
      expect(badge?.dataset.testid).toBe('b');
    });

    it('is given through `ref`', () => {
      let node: HTMLSpanElement | null = null;
      const view = mount(
        <Badge
          content="New"
          ref={(span) => {
            node = span;
          }}
        />,
      );

      expect(node).toBe(badgeOf(view.container));
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without content, or with content that is not React content', () => {
    const check = () => {
      // @ts-expect-error a badge shows something: `content` is required
      <Badge />;
      // @ts-expect-error a function is not something React can show
      <Badge content={() => 'New'} />;
      // @ts-expect-error the content is `content`, not children
      <Badge content="New">children</Badge>;
    };

    expect(check).toBeTypeOf('function');
  });
});
