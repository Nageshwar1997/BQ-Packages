// @vitest-environment jsdom
import { addIcon } from '@iconify/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { click, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { type ISocialProvider, SocialAuth } from './SocialAuth.js';

const PROVIDERS: ISocialProvider[] = [
  { name: 'Google', icon: 'logos:google-icon', href: 'https://api.example/auth/google' },
  { name: 'GitHub', icon: 'logos:github-icon', href: 'https://api.example/auth/github' },
  {
    name: 'LinkedIn',
    icon: <b data-testid="linkedin">in</b>,
    href: 'https://api.example/auth/linkedin',
  },
];

const links = (container: HTMLElement) => [...container.querySelectorAll('a')];

describe('SocialAuth', () => {
  beforeAll(() => {
    // jsdom has no network: an icon that is not registered is an empty placeholder
    addIcon('logos:google-icon', { body: '<path d="M0 0h24v24H0z"/>' });
    addIcon('logos:github-icon', { body: '<path d="M0 0h24v24H0z"/>' });
  });

  afterEach(unmountAll);

  it('draws nothing without providers', () => {
    const view = mount(<SocialAuth providers={[]} />);

    expect(view.container.innerHTML).toBe('');
  });

  it('is a list with a name, and a link for each provider', () => {
    const view = mount(<SocialAuth providers={PROVIDERS} />);
    const list = required(view.container.querySelector('ul'), 'the list');

    expect(list.getAttribute('aria-label')).toBe('Sign in with');
    expect(view.container.querySelectorAll('li')).toHaveLength(3);
    expect(links(view.container)).toHaveLength(3);
  });

  it('can be named in another language, and take a class', () => {
    const view = mount(<SocialAuth providers={PROVIDERS} label="Entrar con" className="mine" />);
    const list = required(view.container.querySelector('ul'), 'the list');

    expect(list.getAttribute('aria-label')).toBe('Entrar con');
    expect(list.className).toContain('mine');
    expect(list.className).toContain('justify-center');
  });

  it('has real links to the address of the provider', () => {
    const view = mount(<SocialAuth providers={PROVIDERS} />);

    expect(links(view.container).map((link) => link.getAttribute('href'))).toEqual(
      PROVIDERS.map((provider) => provider.href),
    );
  });

  it('names each link by the provider, since the icon has no words', () => {
    const view = mount(<SocialAuth providers={PROVIDERS} />);

    expect(links(view.container).map((link) => link.getAttribute('aria-label'))).toEqual([
      'Continue with Google',
      'Continue with GitHub',
      'Continue with LinkedIn',
    ]);
  });

  it('can name them another way', () => {
    const view = mount(
      <SocialAuth providers={PROVIDERS} getLabel={(provider) => `Seguir con ${provider.name}`} />,
    );

    expect(required(links(view.container)[0], 'a link').getAttribute('aria-label')).toBe(
      'Seguir con Google',
    );
  });

  it('draws an icon given by name as a picture that is not read out', () => {
    const view = mount(<SocialAuth providers={PROVIDERS} />);
    const first = required(links(view.container)[0], 'a link');
    const picture = required(first.querySelector('svg, span'), 'the icon');

    expect(picture.getAttribute('aria-hidden')).toBe('true');
    expect(picture.getAttribute('class')).toContain('rounded-xl');
  });

  it('draws an icon given as an element as it is', () => {
    const view = mount(<SocialAuth providers={PROVIDERS} />);

    expect(
      required(links(view.container)[2], 'a link').querySelector('[data-testid="linkedin"]'),
    ).not.toBeNull();
    expect(required(links(view.container)[2], 'a link').querySelector('svg')).toBeNull();
  });

  it('stops the grow of the icon for a person who asked for less motion', () => {
    const view = mount(<SocialAuth providers={PROVIDERS} />);
    const picture = required(links(view.container)[0]?.querySelector('svg, span'), 'the icon');

    expect(picture.getAttribute('class')).toContain('motion-reduce:transition-none');
  });

  it('shows the focus on a link', () => {
    const view = mount(<SocialAuth providers={PROVIDERS} />);

    expect(required(links(view.container)[0], 'a link').className).toContain(
      'focus-visible:outline-2',
    );
  });

  describe('when a provider is pressed', () => {
    it('tells the app which one, before the browser goes on', () => {
      const onProviderClick = vi.fn();
      const view = mount(<SocialAuth providers={PROVIDERS} onProviderClick={onProviderClick} />);
      const link = required(links(view.container)[1], 'a link');
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      let wasStopped = true;

      // what the page sees when the click gets to it; the test stops the navigation that jsdom has not
      document.addEventListener(
        'click',
        (clicked) => {
          wasStopped = clicked.defaultPrevented;
          clicked.preventDefault();
        },
        { once: true },
      );
      link.dispatchEvent(event);

      expect(onProviderClick).toHaveBeenCalledTimes(1);
      expect(onProviderClick.mock.calls[0]?.[0]).toBe(PROVIDERS[1]);
      expect((onProviderClick.mock.calls[0]?.[1] as { target: unknown }).target).toBe(link);
      // the browser goes to the address: the click is not stopped
      expect(wasStopped).toBe(false);
    });

    it('tells it for each one', () => {
      const onProviderClick = vi.fn();
      const view = mount(<SocialAuth providers={PROVIDERS} onProviderClick={onProviderClick} />);

      for (const link of links(view.container)) {
        link.addEventListener('click', (event) => {
          event.preventDefault();
        });
        click(link);
      }

      expect(onProviderClick.mock.calls.map((call) => (call[0] as ISocialProvider).name)).toEqual([
        'Google',
        'GitHub',
        'LinkedIn',
      ]);
    });

    it('works without a function for it', () => {
      const view = mount(<SocialAuth providers={PROVIDERS} />);
      const link = required(links(view.container)[0], 'a link');

      link.addEventListener('click', (event) => {
        event.preventDefault();
      });

      expect(() => {
        click(link);
      }).not.toThrow();
    });
  });

  it('is the same in StrictMode', () => {
    const view = mount(<SocialAuth providers={PROVIDERS} />, { strict: true });

    expect(links(view.container)).toHaveLength(3);
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without providers, or a provider without a name and an address', () => {
    const check = () => {
      // @ts-expect-error the providers are needed
      <SocialAuth />;
      // @ts-expect-error a provider has a name, an icon and an address
      <SocialAuth providers={[{ name: 'Google' }]} />;
      // @ts-expect-error the address is text
      <SocialAuth providers={[{ name: 'Google', icon: 'x', href: 3 }]} />;
    };

    expect(check).toBeTypeOf('function');
  });
});
