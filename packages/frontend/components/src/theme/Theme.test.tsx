// @vitest-environment jsdom
import { createThemeStore, type IStoreStorage } from '@beautinique/frontend-stores';
import { _api } from '@iconify/react';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { Theme } from './Theme.js';

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  const storage: IStoreStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };

  return { storage, data };
};

const makeStore = (theme?: 'dark' | 'light') => {
  const { storage, data } = memoryStorage(theme ? { theme } : {});

  return { useThemeStore: createThemeStore({ storage }), data };
};

const buttonOf = (container: HTMLElement) => container.querySelector('button');
const svgsOf = (container: HTMLElement) => [...container.querySelectorAll('svg')];

// A piece of each icon's drawing that none of the other three has.
const DRAWINGS = {
  sunnyLoop: 'stroke-dasharray="34"',
  moonLoop: 'stroke-dasharray="56"',
  sun: '<circle',
  moon: 'M12 22C17.5228',
} as const;

// Iconify gets an icon's SVG from its API the first time the icon is shown: with no network the
// button would stay empty. These tests take the API away and check the icons are there anyway.
const apiRequests: string[] = [];
let realFetch: ReturnType<typeof _api.getFetch>;

describe('Theme', () => {
  beforeEach(() => {
    realFetch = _api.getFetch();
    apiRequests.length = 0;
    _api.setFetch((url) => {
      apiRequests.push(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url);

      return Promise.reject(new TypeError('Failed to fetch'));
    });
  });

  afterEach(() => {
    unmountAll();
    if (realFetch) _api.setFetch(realFetch);
  });

  describe('the button', () => {
    it('is one button, that does not submit a form', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} />);

      expect(view.container.querySelectorAll('button')).toHaveLength(1);
      expect(buttonOf(view.container)?.type).toBe('button');
    });

    it.each([
      ['dark', 'Switch to light theme'],
      ['light', 'Switch to dark theme'],
    ] as const)('is named for what it does when the theme is %s', (theme, name) => {
      const { useThemeStore } = makeStore(theme);
      const view = mount(<Theme store={useThemeStore} />);

      expect(buttonOf(view.container)?.getAttribute('aria-label')).toBe(name);
    });

    it('can be named in another language', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(
        <Theme
          store={useThemeStore}
          labels={{ toLight: 'Cambiar a tema claro', toDark: 'Cambiar a tema oscuro' }}
        />,
      );
      expect(buttonOf(view.container)?.getAttribute('aria-label')).toBe('Cambiar a tema claro');

      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(buttonOf(view.container)?.getAttribute('aria-label')).toBe('Cambiar a tema oscuro');
    });

    it('keeps the English word for a name that is not given', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} labels={{ toDark: 'Dark please' }} />);

      expect(buttonOf(view.container)?.getAttribute('aria-label')).toBe('Switch to light theme');
    });

    it('gets the attributes it is given, and the classes after its own', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(
        <Theme store={useThemeStore} id="theme" title="Theme" data-testid="t" className="ml-2" />,
      );
      const button = buttonOf(view.container);

      expect(button?.id).toBe('theme');
      expect(button?.title).toBe('Theme');
      expect(button?.getAttribute('data-testid')).toBe('t');
      expect(button?.className.endsWith(' ml-2')).toBe(true);
    });

    it('keeps the name it makes from the theme, whatever aria-label it is given', () => {
      const { useThemeStore } = makeStore('dark');
      // typescript does not check attributes with a hyphen, so this is the only guard
      const view = mount(<Theme store={useThemeStore} aria-label="Mine" />);

      expect(buttonOf(view.container)?.getAttribute('aria-label')).toBe('Switch to light theme');
    });

    it('does not give its own props to the page as attributes', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} labels={{ toDark: 'x' }} />);

      expect(buttonOf(view.container)?.hasAttribute('store')).toBe(false);
      expect(buttonOf(view.container)?.hasAttribute('labels')).toBe(false);
    });

    it('is drawn the same size as before, with a bigger place to press and a ring for the keyboard', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} />);
      const classes = buttonOf(view.container)?.className.split(/\s+/) ?? [];

      for (const own of ['size-5', 'md:size-6', 'cursor-pointer']) {
        expect(classes, own).toContain(own);
      }
      expect(classes).toContain('after:-inset-1'); // the thumb lands next to the icon
      expect(classes).toContain('focus-visible:outline-2');
      // `outline-hidden` sets `--tw-outline-style: none`, which `focus-visible:outline-2` uses: with
      // both, the ring is never drawn (seen in a real browser, jsdom cannot see it).
      expect(classes).not.toContain('outline-hidden');
    });
  });

  describe('the icon', () => {
    it.each([
      ['dark', DRAWINGS.sunnyLoop, DRAWINGS.sun],
      ['light', DRAWINGS.moonLoop, DRAWINGS.moon],
    ] as const)(
      'shows the theme it switches to while it is %s: one that moves and one that is still',
      (theme, moving, still) => {
        const { useThemeStore } = makeStore(theme);
        const view = mount(<Theme store={useThemeStore} />);
        const [animated, steady] = svgsOf(view.container);

        expect(svgsOf(view.container)).toHaveLength(2);
        expect(animated.innerHTML).toContain(moving);
        expect(animated.innerHTML).toContain('<animate');
        expect(steady.innerHTML).toContain(still);
        expect(steady.innerHTML).not.toContain('<animate');
      },
    );

    it('has a different drawing for each theme', () => {
      const dark = mount(<Theme store={makeStore('dark').useThemeStore} />);
      const light = mount(<Theme store={makeStore('light').useThemeStore} />);

      expect(svgsOf(dark.container)[1].innerHTML).not.toBe(svgsOf(light.container)[1].innerHTML);
      expect(svgsOf(dark.container)[0].innerHTML).not.toBe(svgsOf(light.container)[0].innerHTML);
    });

    it('has the four icons without a network: the API of Iconify is never asked', () => {
      for (const theme of ['dark', 'light'] as const) {
        const view = mount(<Theme store={makeStore(theme).useThemeStore} />);

        expect(svgsOf(view.container)).toHaveLength(2); // not the empty place of a missing icon
        view.unmount();
      }

      expect(apiRequests).toEqual([]);
    });

    it('swaps the drawings when the theme changes', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} />);
      expect(svgsOf(view.container)[0].innerHTML).toContain(DRAWINGS.sunnyLoop);

      act(() => {
        buttonOf(view.container)?.click();
      });

      expect(svgsOf(view.container)[0].innerHTML).toContain(DRAWINGS.moonLoop);
      expect(svgsOf(view.container)[1].innerHTML).toContain(DRAWINGS.moon);
    });

    it('hides the one that moves from a person who asked for less motion, and shows the still one', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} />);
      const [animated, steady] = svgsOf(view.container);

      expect(animated.getAttribute('class')?.split(/\s+/)).toContain('motion-reduce:hidden');
      expect(steady.getAttribute('class')?.split(/\s+/)).toEqual(
        expect.arrayContaining(['hidden', 'motion-reduce:block']),
      );
    });

    it('is decoration: the button is named by its label, not by a drawing', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} />);

      for (const svg of svgsOf(view.container)) {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      }
      expect(buttonOf(view.container)?.textContent).toBe('');
    });

    it('fills the button and takes the colours of the text', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} />);
      const classes = svgsOf(view.container)[0].getAttribute('class')?.split(/\s+/) ?? [];

      for (const own of ['size-full', 'text-tertiary', 'hover:text-secondary']) {
        expect(classes, own).toContain(own);
      }
      // the animated icons are drawn with a 2px line, the still ones with 1.5px: all are 1.5px
      for (const svg of svgsOf(view.container)) {
        expect(svg.getAttribute('class')?.split(/\s+/)).toContain('[&_path]:stroke-[1.5]');
      }
    });
  });

  describe('the store', () => {
    it('switches the theme when it is pressed, and remembers it', () => {
      const { useThemeStore, data } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} />);

      act(() => {
        buttonOf(view.container)?.click();
      });

      expect(useThemeStore.getState().theme).toBe('light');
      expect(data.get('theme')).toBe('light');
    });

    it('shows the new theme at once, and goes back and forth', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} />);
      const names: (string | null | undefined)[] = [];

      for (let press = 0; press < 3; press += 1) {
        act(() => {
          buttonOf(view.container)?.click();
        });
        names.push(buttonOf(view.container)?.getAttribute('aria-label'));
      }

      expect(names).toEqual([
        'Switch to dark theme',
        'Switch to light theme',
        'Switch to dark theme',
      ]);
    });

    it('starts from the theme that the person chose last time', () => {
      const { useThemeStore } = makeStore('light');
      const view = mount(<Theme store={useThemeStore} />);

      expect(buttonOf(view.container)?.getAttribute('aria-label')).toBe('Switch to dark theme');
    });

    it('follows a theme that was changed somewhere else', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} />);

      act(() => {
        useThemeStore.setState({ theme: 'light' });
      });

      expect(buttonOf(view.container)?.getAttribute('aria-label')).toBe('Switch to dark theme');
    });

    it('changes the same store from two buttons at once', () => {
      const { useThemeStore } = makeStore('dark');
      const first = mount(<Theme store={useThemeStore} />);
      const second = mount(<Theme store={useThemeStore} />);

      act(() => {
        buttonOf(first.container)?.click();
      });

      expect(buttonOf(second.container)?.getAttribute('aria-label')).toBe('Switch to dark theme');
    });

    it('listens to the store it is given last', () => {
      const dark = makeStore('dark').useThemeStore;
      const light = makeStore('light').useThemeStore;
      const view = mount(<Theme store={dark} />);

      view.rerender(<Theme store={light} />);
      act(() => {
        buttonOf(view.container)?.click();
      });

      expect(light.getState().theme).toBe('dark');
      expect(dark.getState().theme).toBe('dark');
    });

    it('stops listening when it is removed', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} />);
      view.unmount();

      expect(() => {
        act(() => {
          useThemeStore.setState({ theme: 'light' });
        });
      }).not.toThrow();
    });
  });

  describe('in React', () => {
    it('is the same in StrictMode', () => {
      const { useThemeStore } = makeStore('dark');
      const view = mount(<Theme store={useThemeStore} />, { strict: true });

      act(() => {
        buttonOf(view.container)?.click();
      });

      expect(useThemeStore.getState().theme).toBe('light'); // toggled once, not twice
      expect(svgsOf(view.container)).toHaveLength(2);
    });

    // Iconify draws its icons in the browser only: on a server a placeholder is in their place.
    it('can be rendered on a server: the button and its name are there, the icons come in the browser', () => {
      const { useThemeStore } = makeStore('dark');
      const html = renderToString(<Theme store={useThemeStore} />);

      expect(html).toContain('<button');
      expect(html).toContain('aria-label="Switch to light theme"');
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile with something a theme button cannot do', () => {
    const check = () => {
      const { useThemeStore } = makeStore('dark');
      const withSystem = createThemeStore({ themes: ['dark', 'light', 'system'] });

      // @ts-expect-error it needs the store of the app
      <Theme />;
      // @ts-expect-error a sun and a moon button is for two themes
      <Theme store={withSystem} />;
      // @ts-expect-error it is its store that it toggles, not a handler
      <Theme store={useThemeStore} onClick={() => undefined} />;
      // @ts-expect-error it is a button, not a submit
      <Theme store={useThemeStore} type="submit" />;
      // @ts-expect-error the icons are its own
      <Theme store={useThemeStore}>x</Theme>;
    };

    expect(check).toBeTypeOf('function');
  });
});
