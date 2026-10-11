// @vitest-environment jsdom
import type { ComponentProps } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { AuthBottomInstructions } from './AuthBottomInstructions.js';

const TERMS = { href: '/legal/terms' };
const PRIVACY = { href: '/legal/privacy' };

/** The `Link` of a router, as far as these tests need it: it asks for `to`. */
const Link = ({ to, ...rest }: ComponentProps<'a'> & { to: string }) => (
  <a data-router-link="" href={`/app${to}`} {...rest} />
);

const linksOf = (container: HTMLElement) => [...container.querySelectorAll('a')];

describe('AuthBottomInstructions', () => {
  afterEach(() => {
    unmountAll();
  });

  describe('the sentence', () => {
    it('says that going on means accepting both, with a link to each', () => {
      const view = mount(<AuthBottomInstructions terms={TERMS} privacy={PRIVACY} />);

      expect(view.container.textContent).toBe(
        'By continuing, you agree to our Terms & Conditions and Privacy Policy.',
      );
    });

    it('has two links, to the right pages, in this order', () => {
      const view = mount(<AuthBottomInstructions terms={TERMS} privacy={PRIVACY} />);
      const [terms, privacy] = linksOf(view.container);

      expect(linksOf(view.container)).toHaveLength(2);
      expect(terms.textContent).toBe('Terms & Conditions');
      expect(terms.getAttribute('href')).toBe('/legal/terms');
      expect(privacy.textContent).toBe('Privacy Policy');
      expect(privacy.getAttribute('href')).toBe('/legal/privacy');
    });

    it('can name the links in other words', () => {
      const view = mount(
        <AuthBottomInstructions
          terms={TERMS}
          privacy={PRIVACY}
          termsLabel="Conditions of use"
          privacyLabel="Privacy rules"
        />,
      );

      expect(view.container.textContent).toBe(
        'By continuing, you agree to our Conditions of use and Privacy rules.',
      );
    });

    it('can have another sentence, with the links where it wants them', () => {
      const view = mount(
        <AuthBottomInstructions
          terms={TERMS}
          privacy={PRIVACY}
          message={({ privacy, terms }) => (
            <>
              Lee {privacy} y {terms}.
            </>
          )}
        />,
      );
      const [first, second] = linksOf(view.container);

      expect(view.container.textContent).toBe('Lee Privacy Policy y Terms & Conditions.');
      expect(first.getAttribute('href')).toBe('/legal/privacy');
      expect(second.getAttribute('href')).toBe('/legal/terms');
    });

    it('gives the sentence both links, as things to put on the page', () => {
      const message = vi.fn(() => 'text');
      mount(<AuthBottomInstructions terms={TERMS} privacy={PRIVACY} message={message} />);

      expect(message).toHaveBeenCalledTimes(1);
      expect(message).toHaveBeenCalledWith({
        terms: expect.anything() as unknown,
        privacy: expect.anything() as unknown,
      });
    });
  });

  describe('the links', () => {
    it('are made of the gradient text of the brand, a little bolder than the sentence', () => {
      const view = mount(<AuthBottomInstructions terms={TERMS} privacy={PRIVACY} />);

      for (const link of linksOf(view.container)) {
        const classes = link.className.split(/\s+/);

        expect(classes).toContain('bg-accent-duo');
        expect(classes).toContain('font-medium');
        expect(classes).toContain('text-fill-transparent');
      }
    });

    it('keep the other attributes they are given', () => {
      const onClick = vi.fn();
      const view = mount(
        <AuthBottomInstructions
          terms={{ href: '/terms', target: '_blank', rel: 'noopener noreferrer', onClick }}
          privacy={{ href: '/privacy', id: 'privacy-link' }}
        />,
      );
      const [terms, privacy] = linksOf(view.container);

      expect(terms.target).toBe('_blank');
      expect(terms.rel).toBe('noopener noreferrer');
      expect(privacy.id).toBe('privacy-link');
      terms.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('are not given a class of the caller, which would not know which link it is for', () => {
      const view = mount(
        <AuthBottomInstructions
          terms={{ href: '/terms', ...({ className: 'x' } as object) }}
          privacy={PRIVACY}
        />,
      );

      expect(linksOf(view.container)[0].className).not.toContain('x ');
      expect(linksOf(view.container)[0].className.split(/\s+/)).not.toContain('x');
    });

    it('are made by the link of the router when it is given', () => {
      const view = mount(
        <AuthBottomInstructions as={Link} terms={{ to: '/terms' }} privacy={{ to: '/privacy' }} />,
      );
      const links = linksOf(view.container);

      expect(links.map((link) => link.hasAttribute('data-router-link'))).toEqual([true, true]);
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        '/app/terms',
        '/app/privacy',
      ]);
      expect(links.map((link) => link.textContent)).toEqual([
        'Terms & Conditions',
        'Privacy Policy',
      ]);
      expect(links[0].className).toContain('font-medium'); // it got the look too
    });
  });

  describe('the paragraph', () => {
    it('is small and quiet, and gets the attributes it is given, with the classes after its own', () => {
      const view = mount(
        <AuthBottomInstructions
          terms={TERMS}
          privacy={PRIVACY}
          id="legal"
          data-testid="a"
          className="mt-2"
        />,
      );
      const root = view.container.firstElementChild;

      expect(root?.tagName).toBe('P');
      expect(root?.id).toBe('legal');
      expect(root?.getAttribute('data-testid')).toBe('a');
      expect(root?.className).toBe('text-tertiary text-xs mt-2');
    });

    it('does not give its own props to the page as attributes', () => {
      const view = mount(
        <AuthBottomInstructions
          terms={TERMS}
          privacy={PRIVACY}
          termsLabel="T"
          message={() => 'x'}
        />,
      );
      const root = view.container.firstElementChild;

      for (const name of ['terms', 'privacy', 'termslabel', 'privacylabel', 'message', 'as']) {
        expect(root?.hasAttribute(name), name).toBe(false);
      }
    });

    it('is the same in StrictMode and on a server', () => {
      const view = mount(<AuthBottomInstructions terms={TERMS} privacy={PRIVACY} />, {
        strict: true,
      });

      expect(linksOf(view.container)).toHaveLength(2);
      expect(renderToString(<AuthBottomInstructions terms={TERMS} privacy={PRIVACY} />)).toContain(
        'href="/legal/terms"',
      );
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile with something it cannot do', () => {
    const check = () => {
      // @ts-expect-error both links are needed
      <AuthBottomInstructions terms={TERMS} />;
      // @ts-expect-error both links are needed
      <AuthBottomInstructions privacy={PRIVACY} />;
      // @ts-expect-error a link of `<a>` has to go somewhere
      <AuthBottomInstructions terms={{}} privacy={PRIVACY} />;
      // @ts-expect-error the router's link asks for `to`, not `href`
      <AuthBottomInstructions as={Link} terms={TERMS} privacy={PRIVACY} />;
      // @ts-expect-error the sentence is made by `message`
      <AuthBottomInstructions terms={TERMS} privacy={PRIVACY}>
        text
      </AuthBottomInstructions>;
      // @ts-expect-error `message` gets the links and gives back what to show
      <AuthBottomInstructions terms={TERMS} privacy={PRIVACY} message="text" />;
    };

    expect(check).toBeTypeOf('function');
  });
});
