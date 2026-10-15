// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { click, installResizeObserver, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { Breadcrumb, type IBreadcrumbItem } from './Breadcrumb.js';
import { getBreadcrumbItems } from './getBreadcrumbItems.js';

const ITEMS: IBreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Face', href: '/products/face' },
  { label: 'Serum' },
];

const links = (container: HTMLElement) => [...container.querySelectorAll('a')];
const listItems = (container: HTMLElement) => [...container.querySelectorAll('li')];

describe('Breadcrumb', () => {
  beforeEach(() => {
    installResizeObserver();
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
  });

  it('draws nothing without items', () => {
    const view = mount(<Breadcrumb items={[]} />);

    expect(view.container.innerHTML).toBe('');
  });

  describe('the navigation', () => {
    it('is a nav with a list, named', () => {
      const view = mount(<Breadcrumb items={ITEMS} />);
      const nav = required(view.container.querySelector('nav'), 'the nav');

      expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
      expect(nav.querySelector('ol')).not.toBeNull();
      expect(listItems(view.container)).toHaveLength(4);
    });

    it('can be named in the language of the app, and take a class', () => {
      const view = mount(<Breadcrumb items={ITEMS} label="Ruta" className="mine" />);
      const nav = required(view.container.querySelector('nav'), 'the nav');

      expect(nav.getAttribute('aria-label')).toBe('Ruta');
      expect(nav.className).toContain('mine');
    });

    it('says the steps in order', () => {
      const view = mount(<Breadcrumb items={ITEMS} />);

      expect(listItems(view.container).map((item) => item.textContent)).toEqual([
        'Home',
        'Products',
        'Face',
        'Serum',
      ]);
    });
  });

  describe('the steps', () => {
    it('are links to the page above, except the last one', () => {
      const view = mount(<Breadcrumb items={ITEMS} />);

      expect(links(view.container).map((link) => link.getAttribute('href'))).toEqual([
        '/',
        '/products',
        '/products/face',
      ]);
    });

    it('make the last one the current page, as text', () => {
      const view = mount(<Breadcrumb items={ITEMS} />);
      const current = required(
        view.container.querySelector('[aria-current="page"]'),
        'the current page',
      );

      expect(current.textContent).toBe('Serum');
      expect(current.tagName).toBe('SPAN');
      expect(current.className).toContain('opacity-80');
      expect(view.container.querySelectorAll('[aria-current]')).toHaveLength(1);
    });

    it('make the last one text also when it has an address', () => {
      const view = mount(
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Here', href: '/here' },
          ]}
        />,
      );

      expect(links(view.container)).toHaveLength(1);
      expect(view.container.querySelector('[aria-current="page"]')?.textContent).toBe('Here');
    });

    it('are plain text without an address, and not the current page unless last', () => {
      const view = mount(
        <Breadcrumb
          items={[{ label: 'Home', href: '/' }, { label: 'No address' }, { label: 'Here' }]}
        />,
      );
      const middle = required(
        listItems(view.container)[1]?.querySelector('span'),
        'the middle step',
      );

      expect(links(view.container)).toHaveLength(1);
      expect(middle.hasAttribute('aria-current')).toBe(false);
      expect(middle.className).not.toContain('opacity-80');
    });

    it('are the only step when there is one: the current page', () => {
      const view = mount(<Breadcrumb items={[{ label: 'Home', href: '/' }]} />);

      expect(links(view.container)).toHaveLength(0);
      expect(view.container.querySelector('[aria-current="page"]')?.textContent).toBe('Home');
      expect(view.container.querySelector('svg')).toBeNull();
    });

    it('have an arrow between them that is not read out, and none after the last', () => {
      const view = mount(<Breadcrumb items={ITEMS} />);
      const rows = listItems(view.container);

      expect(rows.map((row) => row.querySelectorAll('svg').length)).toEqual([1, 1, 1, 0]);
      for (const arrow of view.container.querySelectorAll('svg'))
        expect(arrow.getAttribute('aria-hidden')).toBe('true');
    });

    it('can be any content', () => {
      const view = mount(
        <Breadcrumb items={[{ label: <b>Bold</b>, href: '/' }, { label: <i>Italic</i> }]} />,
      );

      expect(view.container.querySelector('a b')?.textContent).toBe('Bold');
      expect(view.container.querySelector('span i')?.textContent).toBe('Italic');
    });

    it('are drawn once each when two have the same text', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const view = mount(
        <Breadcrumb
          items={[{ label: 'A', href: '/a' }, { label: 'A', href: '/a' }, { label: 'A' }]}
        />,
      );

      expect(listItems(view.container)).toHaveLength(3);
      expect(error).not.toHaveBeenCalled();
    });
  });

  describe('going to a page', () => {
    it('is left to the browser without onNavigate', () => {
      const view = mount(<Breadcrumb items={ITEMS} />);
      const link = required(links(view.container)[1], 'a link');
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
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

      expect(wasStopped).toBe(false);
    });

    it('is told to the app with onNavigate, and the page is not loaded', () => {
      const onNavigate = vi.fn();
      const view = mount(<Breadcrumb items={ITEMS} onNavigate={onNavigate} />);
      const link = required(links(view.container)[1], 'a link');
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

      link.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate.mock.calls[0]?.[0]).toBe('/products');
      expect((onNavigate.mock.calls[0]?.[1] as { target: unknown }).target).toBe(link);
    });

    it('is told for each link with its own address', () => {
      const onNavigate = vi.fn();
      const view = mount(<Breadcrumb items={ITEMS} onNavigate={onNavigate} />);

      for (const link of links(view.container)) click(link);

      expect(onNavigate.mock.calls.map((call) => call[0] as string)).toEqual([
        '/',
        '/products',
        '/products/face',
      ]);
    });

    it.each([
      ['metaKey', { metaKey: true }],
      ['ctrlKey', { ctrlKey: true }],
      ['shiftKey', { shiftKey: true }],
      ['altKey', { altKey: true }],
      ['a middle click', { button: 1 }],
      ['a right click', { button: 2 }],
    ])('is left to the browser for %s: a new tab or a menu', (_name, init) => {
      const onNavigate = vi.fn();
      const view = mount(<Breadcrumb items={ITEMS} onNavigate={onNavigate} />);
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        ...init,
      });

      required(links(view.container)[0], 'a link').dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('is left to the browser for a link that opens in another window', () => {
      const onNavigate = vi.fn();
      const view = mount(<Breadcrumb items={ITEMS} onNavigate={onNavigate} />);
      const link = required(links(view.container)[0], 'a link');

      link.target = '_blank';
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

      link.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('is not told again for a click that something else already handled', () => {
      const onNavigate = vi.fn();
      const view = mount(
        <div
          onClickCapture={(event) => {
            event.preventDefault();
          }}
        >
          <Breadcrumb items={ITEMS} onNavigate={onNavigate} />
        </div>,
      );

      click(required(links(view.container)[0], 'a link'));

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('is the same for a link that opens in the same window by name', () => {
      const onNavigate = vi.fn();
      const view = mount(<Breadcrumb items={ITEMS} onNavigate={onNavigate} />);
      const link = required(links(view.container)[0], 'a link');

      link.target = '_self';
      click(link);

      expect(onNavigate).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the focus on a link', () => {
    const view = mount(<Breadcrumb items={ITEMS} />);

    expect(required(links(view.container)[0], 'a link').className).toContain(
      'focus-visible:outline-2',
    );
  });

  it('is the same in StrictMode', () => {
    const view = mount(<Breadcrumb items={ITEMS} />, { strict: true });

    expect(listItems(view.container)).toHaveLength(4);
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without items, or an item without a label', () => {
    const check = () => {
      // @ts-expect-error the items are needed
      <Breadcrumb />;
      // @ts-expect-error an item has a label
      <Breadcrumb items={[{ href: '/' }]} />;
      // @ts-expect-error the address is text
      <Breadcrumb items={[{ label: 'a', href: 3 }]} />;
    };

    expect(check).toBeTypeOf('function');
  });
});

describe('getBreadcrumbItems', () => {
  beforeEach(() => {
    installResizeObserver();
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
  });

  it('is only Home for the top of the site', () => {
    expect(getBreadcrumbItems('/')).toEqual([{ label: 'Home', href: '/' }]);
    expect(getBreadcrumbItems('')).toEqual([{ label: 'Home', href: '/' }]);
  });

  it('is a step for each part of the path, each with the address of the page', () => {
    expect(getBreadcrumbItems('/products/face/serum')).toEqual([
      { label: 'Home', href: '/' },
      { label: 'products', href: '/products' },
      { label: 'face', href: '/products/face' },
      { label: 'serum', href: '/products/face/serum' },
    ]);
  });

  it('turns a run of dashes into one space', () => {
    expect(getBreadcrumbItems('/skin--care__oil').map((item) => item.label)).toEqual([
      'Home',
      'skin care oil',
    ]);
  });

  it('turns dashes and underscores into spaces, all of them', () => {
    const items = getBreadcrumbItems('/skin-care/anti-aging-night_cream');

    expect(items.map((item) => item.label)).toEqual([
      'Home',
      'skin care',
      'anti aging night cream',
    ]);
  });

  it('decodes the escapes of an address, and leaves alone a text that is no escape', () => {
    const items = getBreadcrumbItems('/caf%C3%A9/100%/a%20b');

    expect(items.map((item) => item.label)).toEqual(['Home', 'café', '100%', 'a b']);
    expect(items.map((item) => item.href)).toEqual([
      '/',
      '/caf%C3%A9',
      '/caf%C3%A9/100%',
      '/caf%C3%A9/100%/a%20b',
    ]);
  });

  it('leaves out the query string, the hash, empty parts and the slash at the end', () => {
    expect(getBreadcrumbItems('/a//b/?x=1#top').map((item) => item.href)).toEqual([
      '/',
      '/a',
      '/a/b',
    ]);
    expect(getBreadcrumbItems('/a/b#section').map((item) => item.href)).toEqual([
      '/',
      '/a',
      '/a/b',
    ]);
    expect(getBreadcrumbItems('?x=/y/z')).toEqual([{ label: 'Home', href: '/' }]);
  });

  it('names and sends the first step as the app says', () => {
    const items = getBreadcrumbItems('/a', { homeLabel: 'Inicio', homeHref: '/es' });

    expect(items[0]).toEqual({ label: 'Inicio', href: '/es' });
  });

  it('makes the text of the steps as the app says', () => {
    const items = getBreadcrumbItems('/a-b/c', {
      formatSegment: (segment) => segment.toUpperCase(),
    });

    expect(items.map((item) => item.label)).toEqual(['Home', 'A-B', 'C']);
  });

  it('works with the items of the component: the last one is the current page', () => {
    const view = mount(<Breadcrumb items={getBreadcrumbItems('/products/face')} />);

    expect(view.container.querySelector('[aria-current="page"]')?.textContent).toBe('face');
    expect(links(view.container).map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/products',
    ]);
  });
});
