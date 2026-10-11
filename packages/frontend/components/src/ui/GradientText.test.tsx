// @vitest-environment jsdom
import type { ReactNode, Ref } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { GradientText } from './GradientText.js';

/** A link component like the one of a router: its own prop is `to`. */
const Link = ({
  to,
  className,
  children,
  ref,
}: {
  to: string;
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
}) => (
  <a href={to} className={className} ref={ref}>
    {children}
  </a>
);

const textOf = (container: HTMLElement) => container.firstElementChild;

describe('GradientText', () => {
  afterEach(() => {
    unmountAll();
  });

  describe('what it shows', () => {
    it('shows `text`', () => {
      const view = mount(<GradientText text="Terms" type="accent" />);

      expect(textOf(view.container)?.textContent).toBe('Terms');
    });

    it('shows `children`, anything React can show', () => {
      const view = mount(
        <GradientText type="silver">
          Hello <b>world</b>
        </GradientText>,
      );

      expect(textOf(view.container)?.textContent).toBe('Hello world');
      expect(textOf(view.container)?.querySelector('b')).not.toBeNull();
    });

    it('is a <span> unless it is told otherwise', () => {
      const view = mount(<GradientText text="Terms" type="accent" />);

      expect(textOf(view.container)?.tagName).toBe('SPAN');
    });
  });

  describe('its gradient', () => {
    it('fills the text with the accent gradient', () => {
      const view = mount(<GradientText text="Terms" type="accent" />);
      const classes = textOf(view.container)?.className.split(' ') ?? [];

      expect(classes).toContain('bg-accent-duo');
      expect(classes).toContain('text-fill-transparent');
      expect(classes).not.toContain('bg-silver-duo');
    });

    it('fills the text with the silver gradient', () => {
      const view = mount(<GradientText text="Terms" type="silver" />);
      const classes = textOf(view.container)?.className.split(' ') ?? [];

      expect(classes).toContain('bg-silver-duo');
      expect(classes).not.toContain('bg-accent-duo');
    });

    it('does not vanish in forced-colors mode (high contrast): the text takes the system colour', () => {
      const view = mount(<GradientText text="Terms" type="accent" />);
      const classes = textOf(view.container)?.className.split(' ') ?? [];

      expect(classes).toContain('forced-colors:bg-none');
      expect(classes).toContain('forced-colors:[-webkit-text-fill-color:currentColor]');
    });

    it('adds the classes it is given after its own', () => {
      const view = mount(<GradientText text="Terms" type="accent" className="font-medium" />);
      const classes = textOf(view.container)?.className.split(/\s+/) ?? [];

      expect(classes).toContain('font-medium');
      expect(classes.indexOf('font-medium')).toBeGreaterThan(classes.indexOf('bg-accent-duo'));
    });
  });

  describe('as another element or component', () => {
    it('is rendered by the element it is told to be: a link', () => {
      const view = mount(<GradientText as="a" href="/terms" type="accent" text="Terms" />);
      const link = textOf(view.container);

      expect(link?.tagName).toBe('A');
      expect(link?.getAttribute('href')).toBe('/terms');
      expect(link?.className).toContain('bg-accent-duo');
    });

    it('is rendered by a component, with the props of that component', () => {
      const view = mount(<GradientText as={Link} to="/privacy" type="silver" text="Privacy" />);
      const link = textOf(view.container);

      expect(link?.tagName).toBe('A');
      expect(link?.getAttribute('href')).toBe('/privacy');
      expect(link?.textContent).toBe('Privacy');
      expect(link?.className).toContain('bg-silver-duo'); // it is the link itself that has the gradient
      expect(link?.querySelector('span')).toBeNull(); // no extra element inside it
    });

    it('passes the attributes it is given on', () => {
      const view = mount(
        <GradientText
          type="accent"
          text="Terms"
          id="t"
          title="Read"
          data-testid="g"
          aria-label="Terms"
        />,
      );
      const text = textOf(view.container);

      expect(text?.id).toBe('t');
      expect(text?.getAttribute('title')).toBe('Read');
      expect(text?.getAttribute('aria-label')).toBe('Terms');
      expect(text?.getAttribute('data-testid')).toBe('g');
    });

    it('does not turn its own props into attributes', () => {
      const view = mount(<GradientText text="Terms" type="accent" />);
      const text = textOf(view.container);

      expect(text?.hasAttribute('type')).toBe(false);
      expect(text?.hasAttribute('text')).toBe(false);
    });

    it('is given through `ref`', () => {
      let node: HTMLAnchorElement | null = null;
      const view = mount(
        <GradientText
          as={Link}
          to="/terms"
          type="accent"
          text="Terms"
          ref={(a) => {
            node = a;
          }}
        />,
      );

      expect(node).toBe(textOf(view.container));
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile with the wrong props', () => {
    const check = () => {
      // @ts-expect-error a gradient text has a type
      <GradientText text="Terms" />;
      // @ts-expect-error there are two gradients, accent and silver
      <GradientText text="Terms" type="gold" />;
      // @ts-expect-error it shows something: `text` or `children`
      <GradientText type="accent" />;
      // @ts-expect-error `text` and `children` are two ways to say the same: one of them
      <GradientText type="accent" text="Terms">
        Terms
      </GradientText>;
      // @ts-expect-error the link component needs its own prop (`to`)
      <GradientText as={Link} type="accent" text="Terms" />;
      // @ts-expect-error `to` is not an attribute of a span
      <GradientText to="/terms" type="accent" text="Terms" />;
    };

    expect(check).toBeTypeOf('function');
  });
});
