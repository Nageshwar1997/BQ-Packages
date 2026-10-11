// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { Divider } from './Divider.js';

const lineOf = (container: HTMLElement) => container.querySelector('hr');

describe('Divider', () => {
  afterEach(() => {
    unmountAll();
  });

  it('is an <hr>, which assistive technology reads as a separator', () => {
    const view = mount(<Divider />);
    const line = lineOf(view.container);

    expect(line).not.toBeNull();
    expect(line?.getAttribute('role')).toBeNull(); // the role comes with the element
    expect(view.container.children).toHaveLength(1);
  });

  it('is a thin line as wide as its container', () => {
    const view = mount(<Divider />);
    const classes = lineOf(view.container)?.className.split(' ') ?? [];

    for (const own of ['bg-hr-line', 'block', 'h-px', 'w-full', 'border-none']) {
      expect(classes, own).toContain(own);
    }
  });

  it('adds the classes it is given after its own', () => {
    const view = mount(<Divider className="my-4 h-0.5" />);
    const classes = lineOf(view.container)?.className.split(/\s+/) ?? [];

    expect(classes).toContain('my-4');
    expect(classes.indexOf('my-4')).toBeGreaterThan(classes.indexOf('h-px'));
  });

  it('gets the attributes it is given, e.g. to be hidden from assistive technology', () => {
    const view = mount(<Divider aria-hidden="true" id="line" data-testid="d" />);
    const line = lineOf(view.container);

    expect(line?.getAttribute('aria-hidden')).toBe('true');
    expect(line?.id).toBe('line');
    expect(line?.dataset.testid).toBe('d');
  });

  it('is given through `ref`', () => {
    let node: HTMLHRElement | null = null;
    const view = mount(
      <Divider
        ref={(hr) => {
          node = hr;
        }}
      />,
    );

    expect(node).toBe(lineOf(view.container));
  });

  it('does not take children: an <hr> has none', () => {
    const check = () => {
      // @ts-expect-error an <hr> cannot have children
      <Divider>text</Divider>;
    };

    expect(check).toBeTypeOf('function');
  });
});
