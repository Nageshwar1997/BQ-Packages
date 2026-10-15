// @vitest-environment jsdom
import { type RefObject, useRef } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { keyDown, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { getTabbable } from './focus.js';
import { useFocusTrap } from './useFocusTrap.js';
import { useIsClient } from './useIsClient.js';
import { useScrollLock } from './useScrollLock.js';

const setScrollbar = (width: number) => {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: window.innerWidth - width,
  });
};

const Lock = ({ enabled = true }: { enabled?: boolean }) => {
  useScrollLock(enabled);

  return null;
};

describe('useScrollLock', () => {
  beforeEach(() => {
    setScrollbar(0);
    document.body.removeAttribute('style');
  });

  afterEach(() => {
    unmountAll();
    document.body.removeAttribute('style');
  });

  it('keeps the page from scrolling while it is on, and gives it back after', () => {
    const view = mount(<Lock />);
    expect(document.body.style.overflow).toBe('hidden');

    view.unmount();

    expect(document.body.style.overflow).toBe('');
  });

  it('gives back what the page had, not "hidden" nor nothing', () => {
    document.body.style.overflow = 'scroll';
    document.body.style.paddingRight = '4px';
    const view = mount(<Lock />);

    view.unmount();

    expect(document.body.style.overflow).toBe('scroll');
    expect(document.body.style.paddingRight).toBe('4px');
  });

  it('does nothing while it is off, and starts when it is switched on', () => {
    const view = mount(<Lock enabled={false} />);
    expect(document.body.style.overflow).toBe('');

    view.rerender(<Lock enabled />);
    expect(document.body.style.overflow).toBe('hidden');

    view.rerender(<Lock enabled={false} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('puts back the width of the scrollbar that goes away, so the page does not jump', () => {
    setScrollbar(15);
    document.body.style.paddingRight = '';
    const view = mount(<Lock />);

    expect(document.body.style.paddingRight).toBe('15px');

    view.unmount();

    expect(document.body.style.paddingRight).toBe('');
  });

  it('adds the width of the scrollbar to the padding the page already had', () => {
    setScrollbar(15);
    document.body.style.paddingRight = '4px';
    const view = mount(<Lock />);

    expect(document.body.style.paddingRight).toBe('19px');

    view.unmount();

    expect(document.body.style.paddingRight).toBe('4px');
  });

  it('does not add padding when the page has no scrollbar', () => {
    setScrollbar(0);
    mount(<Lock />);

    expect(document.body.style.paddingRight).toBe('');
  });

  it('holds the page until the last of several holders lets go', () => {
    const first = mount(<Lock />);
    const second = mount(<Lock />);

    first.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    second.unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('gives back the original even when the first to lock is the last to let go', () => {
    document.body.style.overflow = 'auto';
    const first = mount(<Lock />);
    const second = mount(<Lock />);

    second.unmount();
    first.unmount();

    expect(document.body.style.overflow).toBe('auto');
  });

  it('is the same in StrictMode', () => {
    const view = mount(<Lock />, { strict: true });
    expect(document.body.style.overflow).toBe('hidden');

    view.unmount();

    expect(document.body.style.overflow).toBe('');
  });
});

describe('getTabbable', () => {
  const html = (markup: string) => {
    const root = document.createElement('div');

    root.innerHTML = markup;

    return root;
  };

  it('finds what the Tab key stops on, in order', () => {
    const root = html(`
      <a href="/x" id="a">link</a>
      <button id="b">button</button>
      <input id="c" />
      <select id="d"></select>
      <textarea id="e"></textarea>
      <div tabindex="0" id="f"></div>
      <div contenteditable id="g"></div>`);
    // jsdom gives a field that can be edited no tab index; a browser says 0
    Object.defineProperty(required(root.querySelector('#g'), 'the editable'), 'tabIndex', {
      value: 0,
    });

    expect(getTabbable(root).map((el) => el.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });

  it('leaves out what cannot be reached', () => {
    const root = html(`
      <button disabled id="a"></button>
      <input type="hidden" id="b" />
      <input disabled id="c" />
      <select disabled id="s"></select>
      <textarea disabled id="t"></textarea>
      <div tabindex="-1" id="d"></div>
      <a id="e">no href</a>
      <div hidden><button id="f"></button></div>
      <div inert><button id="g"></button></div>
      <div contenteditable="false" id="h"></div>
      <button id="ok"></button>`);

    expect(getTabbable(root).map((el) => el.id)).toEqual(['ok']);
  });

  it('is empty when there is nothing', () => {
    expect(getTabbable(html('<p>text</p>'))).toEqual([]);
  });
});

describe('useIsClient', () => {
  afterEach(unmountAll);

  const Probe = () => <span>{useIsClient() ? 'client' : 'server'}</span>;

  it('is false when it is rendered on a server, true in the browser', () => {
    expect(renderToString(<Probe />)).toContain('server');

    const view = mount(<Probe />);

    expect(view.container.textContent).toBe('client');
  });
});

const Dialog = ({
  enabled = true,
  focusMiddle = false,
  returnFocus,
  withButtons = true,
  label = 'dialog',
}: {
  enabled?: boolean;
  focusMiddle?: boolean;
  returnFocus?: boolean;
  withButtons?: boolean;
  label?: string;
}) => {
  const middle = useRef<HTMLButtonElement | null>(null);
  const initialFocus: RefObject<HTMLElement | null> | undefined = focusMiddle ? middle : undefined;
  const ref = useFocusTrap<HTMLDivElement>({ enabled, initialFocus, returnFocus });

  return (
    <div ref={ref} tabIndex={-1} data-testid={label}>
      {withButtons && (
        <>
          <button type="button">first</button>
          <button type="button" ref={middle}>
            middle
          </button>
          <button type="button">last</button>
        </>
      )}
    </div>
  );
};

const buttonNamed = (name: string) =>
  required(
    [...document.querySelectorAll('button')].find((b) => b.textContent === name),
    name,
  );

describe('useFocusTrap', () => {
  afterEach(() => {
    unmountAll();
    document.body.replaceChildren();
  });

  const opener = () => {
    const button = document.createElement('button');

    button.textContent = 'opener';
    document.body.append(button);
    button.focus();

    return button;
  };

  describe('when it opens', () => {
    it('puts the focus on the first thing that Tab stops on', () => {
      opener();
      mount(<Dialog />);

      expect(document.activeElement).toBe(buttonNamed('first'));
    });

    it('puts it on the element it is told to', () => {
      opener();
      mount(<Dialog focusMiddle />);

      expect(document.activeElement).toBe(buttonNamed('middle'));
    });

    it('puts it on the dialog itself when there is nothing in it to focus', () => {
      opener();
      mount(<Dialog withButtons={false} />);

      expect(document.activeElement?.getAttribute('data-testid')).toBe('dialog');
    });

    it('does nothing while it is off, and starts when it is switched on', () => {
      const before = opener();
      const view = mount(<Dialog enabled={false} />);
      expect(document.activeElement).toBe(before);

      view.rerender(<Dialog enabled />);

      expect(document.activeElement).toBe(buttonNamed('first'));
    });
  });

  describe('with Tab', () => {
    it('goes from the last element to the first', () => {
      opener();
      mount(<Dialog />);
      buttonNamed('last').focus();

      const event = keyDown(document, 'Tab');

      expect(document.activeElement).toBe(buttonNamed('first'));
      expect(event.defaultPrevented).toBe(true);
    });

    it('goes from the first element to the last with Shift + Tab', () => {
      opener();
      mount(<Dialog />);

      keyDown(document, 'Tab', { shiftKey: true });

      expect(document.activeElement).toBe(buttonNamed('last'));
    });

    it('lets Tab move inside the dialog as it does', () => {
      opener();
      mount(<Dialog />);
      buttonNamed('middle').focus();

      const event = keyDown(document, 'Tab');

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(buttonNamed('middle'));
    });

    it('lets Tab go on from the first element, and Shift + Tab from the last', () => {
      opener();
      mount(<Dialog />);

      const forward = keyDown(document, 'Tab');
      expect(forward.defaultPrevented).toBe(false);

      buttonNamed('last').focus();
      const backward = keyDown(document, 'Tab', { shiftKey: true });
      expect(backward.defaultPrevented).toBe(false);
    });

    it('brings the focus in from the dialog itself: Shift + Tab from it must not leave', () => {
      opener();
      mount(<Dialog />);
      required(document.querySelector<HTMLElement>('[data-testid="dialog"]'), 'the dialog').focus();

      const event = keyDown(document, 'Tab', { shiftKey: true });

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(buttonNamed('last'));
    });

    it('brings the focus in when it is on the page behind', () => {
      const outside = opener();
      mount(<Dialog />);
      outside.focus();

      keyDown(document, 'Tab');
      expect(document.activeElement).toBe(buttonNamed('first'));

      outside.focus();
      keyDown(document, 'Tab', { shiftKey: true });
      expect(document.activeElement).toBe(buttonNamed('last'));
    });

    it('brings the focus to the dialog when there is nothing in it and the focus is outside', () => {
      const outside = opener();
      mount(<Dialog withButtons={false} />);
      outside.focus();

      keyDown(document, 'Tab');

      expect(document.activeElement?.getAttribute('data-testid')).toBe('dialog');
    });

    it('keeps the focus on the dialog when there is nothing to move to', () => {
      opener();
      mount(<Dialog withButtons={false} />);

      const event = keyDown(document, 'Tab');

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement?.getAttribute('data-testid')).toBe('dialog');
    });

    it('ignores the other keys', () => {
      opener();
      mount(<Dialog />);
      buttonNamed('last').focus();

      const event = keyDown(document, 'Enter');

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(buttonNamed('last'));
    });

    it('keeps only the dialog that opened last: the one under it does not take the Tab', () => {
      opener();
      const view = mount(<Dialog label="under" />);
      view.rerender(
        <>
          <Dialog label="under" />
          <Dialog label="over" />
        </>,
      );
      const over = required(document.querySelector('[data-testid="over"]'), 'the top dialog');
      const lastOfOver = required(
        [...over.querySelectorAll('button')].at(-1),
        'last of the top one',
      );
      lastOfOver.focus();
      const moved: Element[] = [];
      const record = (event: Event) => {
        if (event.target instanceof Element) moved.push(event.target);
      };

      document.addEventListener('focusin', record);
      keyDown(document, 'Tab');
      document.removeEventListener('focusin', record);

      // the focus moved once: the dialog below did not take it for a moment
      expect(moved).toEqual([required(over.querySelector('button'), 'first of the top one')]);
    });
  });

  describe('when it closes', () => {
    it('gives the Tab back to the dialog below, when the one on top closes', () => {
      opener();
      const view = mount(
        <>
          <Dialog label="under" />
          <Dialog label="over" />
        </>,
      );

      view.rerender(
        <>
          <Dialog label="under" />
          <Dialog label="over" enabled={false} />
        </>,
      );
      const under = required(document.querySelector('[data-testid="under"]'), 'the dialog below');
      required([...under.querySelectorAll('button')].at(-1), 'its last button').focus();

      const event = keyDown(document, 'Tab');

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(required(under.querySelector('button'), 'its first'));
    });

    it('removes the listener it added', () => {
      const added = vi.spyOn(document, 'addEventListener');
      const removed = vi.spyOn(document, 'removeEventListener');

      opener();
      const view = mount(<Dialog />);
      const [, listener] = required(
        added.mock.calls.find(([type]) => type === 'keydown'),
        'the listener',
      );

      view.unmount();

      expect(removed).toHaveBeenCalledWith('keydown', listener);
      vi.restoreAllMocks();
    });

    it('gives the focus back to what had it before', () => {
      const before = opener();
      const view = mount(<Dialog />);
      expect(document.activeElement).not.toBe(before);

      view.unmount();

      expect(document.activeElement).toBe(before);
    });

    it('gives it back when it is switched off', () => {
      const before = opener();
      const view = mount(<Dialog />);

      view.rerender(<Dialog enabled={false} />);

      expect(document.activeElement).toBe(before);
    });

    it('does not, when it is told not to', () => {
      const before = opener();
      const view = mount(<Dialog returnFocus={false} />);

      view.unmount();

      expect(document.activeElement).not.toBe(before);
    });

    it('does not fail when what had the focus has gone', () => {
      const before = opener();
      const view = mount(<Dialog />);
      before.remove();

      expect(() => {
        view.unmount();
      }).not.toThrow();
    });

    it('stops catching Tab', () => {
      opener();
      const view = mount(<Dialog />);
      view.unmount();

      const event = keyDown(document, 'Tab');

      expect(event.defaultPrevented).toBe(false);
    });
  });

  it('is the same in StrictMode: the focus is in, and goes back once', () => {
    const before = opener();
    const view = mount(<Dialog />, { strict: true });
    expect(document.activeElement).toBe(buttonNamed('first'));

    view.unmount();

    expect(document.activeElement).toBe(before);
  });
});
