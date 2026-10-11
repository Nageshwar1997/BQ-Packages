// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { LinearGradient, type TGradientPosition } from './LinearGradient.js';

const gradientOf = (container: HTMLElement) => container.firstElementChild;

describe('LinearGradient', () => {
  afterEach(() => {
    unmountAll();
  });

  describe.each([
    ['top', ['inset-x-0', 'top-0', 'h-10', 'md:h-20', 'bg-linear-to-b']],
    ['bottom', ['inset-x-0', 'bottom-0', 'h-10', 'md:h-20', 'bg-linear-to-t']],
    ['left', ['inset-y-0', 'left-0', 'w-10', 'md:w-20', 'bg-linear-to-r']],
    ['right', ['inset-y-0', 'right-0', 'w-10', 'md:w-20', 'bg-linear-to-l']],
  ] as const)('on the %s', (position, expected) => {
    it('sits on that edge and fades inwards', () => {
      const view = mount(<LinearGradient position={position} />);
      const classes = gradientOf(view.container)?.className.split(' ') ?? [];

      for (const own of expected) expect(classes, own).toContain(own);
    });

    it('has none of the classes of the other edges', () => {
      const view = mount(<LinearGradient position={position} />);
      const classes = gradientOf(view.container)?.className.split(' ') ?? [];
      const others = (['top', 'bottom', 'left', 'right'] as TGradientPosition[]).filter(
        (edge) => edge !== position,
      );

      for (const edge of others) {
        expect(classes, `${edge}-0`).not.toContain(`${edge}-0`);
      }
    });
  });

  it('is a decoration: the pointer goes through it and assistive technology skips it', () => {
    const view = mount(<LinearGradient position="top" />);
    const gradient = gradientOf(view.container);

    expect(gradient?.className.split(' ')).toContain('pointer-events-none');
    expect(gradient?.getAttribute('aria-hidden')).toBe('true');
  });

  it('is drawn in the background colour, fading to nothing, over what it is next to', () => {
    const view = mount(<LinearGradient position="top" />);
    const classes = gradientOf(view.container)?.className.split(' ') ?? [];

    for (const own of ['from-primary-invert', 'to-transparent', 'absolute', 'z-1']) {
      expect(classes, own).toContain(own);
    }
  });

  it('adds the classes it is given after its own', () => {
    const view = mount(<LinearGradient position="bottom" className="w-full!" />);
    const classes = gradientOf(view.container)?.className.split(/\s+/) ?? [];

    expect(classes).toContain('w-full!');
    expect(classes.indexOf('w-full!')).toBeGreaterThan(classes.indexOf('bg-linear-to-t'));
  });

  it('gets the attributes it is given', () => {
    const view = mount(<LinearGradient position="left" id="fade" data-testid="g" />);
    const gradient = gradientOf(view.container);

    expect(gradient?.id).toBe('fade');
    expect(gradient?.getAttribute('data-testid')).toBe('g');
  });

  it('is given through `ref`', () => {
    let node: HTMLDivElement | null = null;
    const view = mount(
      <LinearGradient
        position="top"
        ref={(div) => {
          node = div;
        }}
      />,
    );

    expect(node).toBe(gradientOf(view.container));
  });

  it('draws nothing, and not the text "undefined", for a position that is not one', () => {
    const view = mount(<LinearGradient position={'middle' as TGradientPosition} />);
    const className = gradientOf(view.container)?.className ?? '';

    expect(className).not.toContain('undefined');
    expect(className.split(/\s+/)).not.toContain('bg-linear-to-b');
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without a position, or with one that does not exist', () => {
    const check = () => {
      // @ts-expect-error it has to be put on an edge
      <LinearGradient />;
      // @ts-expect-error the edges are top, bottom, left and right
      <LinearGradient position="middle" />;
      // @ts-expect-error it is only decoration, it has no children
      <LinearGradient position="top">content</LinearGradient>;
    };

    expect(check).toBeTypeOf('function');
  });
});
