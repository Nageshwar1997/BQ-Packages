// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { ApiStatus } from './ApiStatus.js';

const first = (container: HTMLElement) =>
  required(container.firstElementChild, 'the first element');

describe('ApiStatus', () => {
  afterEach(unmountAll);

  describe('while it loads', () => {
    it('shows the rings with "Loading...." unless told another word', () => {
      const plain = mount(<ApiStatus status="loading" />);
      const other = mount(<ApiStatus status="loading" text="Loading orders" />);

      expect(plain.container.textContent).toBe('Loading....');
      expect(other.container.textContent).toBe('Loading orders');
    });

    it('is a status for a screen reader', () => {
      const view = mount(<ApiStatus status="loading" />);

      expect(view.container.querySelector('[role="status"]')).not.toBeNull();
    });
  });

  describe.each([
    ['error', 'alert'],
    ['success', 'status'],
    ['empty', 'status'],
  ] as const)('%s', (status, role) => {
    it(`says its title and description, as a ${role}`, () => {
      const view = mount(<ApiStatus status={status} title="Title" description="Description" />);
      const message = required(view.container.querySelector(`[role="${role}"]`), 'the message');

      expect(message.textContent).toBe('TitleDescription');
    });

    it('has an icon of its own, without a network', () => {
      const view = mount(<ApiStatus status={status} title="Title" />);

      expect(view.container.querySelector('svg')?.innerHTML.length).toBeGreaterThan(10);
    });
  });

  it('has a different icon for each of the three', () => {
    const drawings = (['error', 'success', 'empty'] as const).map((status) => {
      const view = mount(<ApiStatus status={status} title="T" />);

      return view.container.querySelector('svg')?.innerHTML;
    });

    expect(new Set(drawings).size).toBe(3);
  });

  it('is an alert only when it is an error', () => {
    const error = mount(<ApiStatus status="error" title="T" />);
    const empty = mount(<ApiStatus status="empty" title="T" />);

    expect(error.container.querySelector('[role="alert"]')).not.toBeNull();
    expect(empty.container.querySelector('[role="alert"]')).toBeNull();
  });

  it('can have a title that is not text, and a description of several lines', () => {
    const view = mount(
      <ApiStatus
        status="error"
        title={<b data-testid="title">Oops</b>}
        description={
          <>
            <span>One</span>
            <span>Two</span>
          </>
        }
      />,
    );

    expect(view.container.querySelector('[data-testid="title"]')?.textContent).toBe('Oops');
    expect(view.container.textContent).toContain('OneTwo');
  });

  it('draws nothing for a title or a description that is not there', () => {
    const view = mount(<ApiStatus status="empty" title="" />);
    const message = required(view.container.querySelector('[role="status"]'), 'the message');

    expect(message.children).toHaveLength(1); // only the icon
  });

  it('draws the line only when `divider` is true', () => {
    const with_ = mount(<ApiStatus status="empty" title="T" divider />);
    const withoutIt = mount(<ApiStatus status="empty" title="T" />);
    const explicitFalse = mount(<ApiStatus status="empty" title="T" divider={false} />);

    expect(with_.container.querySelector('hr')).not.toBeNull();
    expect(withoutIt.container.querySelector('hr')).toBeNull();
    expect(explicitFalse.container.querySelector('hr')).toBeNull(); // it used to be drawn for `false` too
  });

  it('fills its place and takes its class after its own', () => {
    const view = mount(<ApiStatus status="empty" title="T" className="min-h-20!" />);
    const classes = first(view.container).className;

    expect(classes).toContain('min-h-60');
    expect(classes.endsWith(' min-h-20!')).toBe(true);
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without a status, or an error without a title', () => {
    const check = () => {
      // @ts-expect-error it has to say what it is
      <ApiStatus />;
      // @ts-expect-error an error has a title
      <ApiStatus status="error" />;
      // @ts-expect-error loading has no title, only the word under the rings
      <ApiStatus status="loading" title="x" />;
      // @ts-expect-error the statuses are error, empty, success and loading
      <ApiStatus status="pending" title="x" />;
    };

    expect(check).toBeTypeOf('function');
  });
});
