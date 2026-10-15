// @vitest-environment jsdom
import { act, useRef, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { click, installResizeObserver, keyDown, press, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { ModalWrapper } from './ModalWrapper.js';

const dialog = () => document.querySelector<HTMLElement>('[aria-modal="true"]');
const theDialog = () => required(dialog(), 'the dialog');
const backdrop = () => required(theDialog().parentElement, 'the backdrop');
const buttonNamed = (name: string) =>
  required(
    [...document.querySelectorAll('button')].find(
      (button) => button.textContent === name || button.getAttribute('aria-label') === name,
    ),
    name,
  );

/** A press on an element and the click that follows it, as a person's mouse makes. */
const pressAndClick = (target: Element, clickTarget: Element = target) => {
  press(target);
  click(clickTarget);
};

describe('ModalWrapper', () => {
  beforeEach(() => {
    installResizeObserver();
    document.body.removeAttribute('style');
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    document.body.removeAttribute('style');
  });

  describe('when it is closed', () => {
    it('draws nothing', () => {
      const view = mount(
        <ModalWrapper isOpen={false} onClose={vi.fn()} label="Sign in">
          <p>Inside</p>
        </ModalWrapper>,
      );

      expect(dialog()).toBeNull();
      expect(document.body.textContent).toBe('');
      expect(view.container.innerHTML).toBe('');
    });

    it('does not lock the page, nor take the focus', () => {
      const before = document.createElement('button');

      document.body.append(before);
      before.focus();
      mount(
        <ModalWrapper isOpen={false} onClose={vi.fn()} label="x">
          <button type="button">in</button>
        </ModalWrapper>,
      );

      expect(document.body.style.overflow).toBe('');
      expect(document.activeElement).toBe(before);
    });
  });

  describe('when it is open', () => {
    it('is drawn in the body, outside of where it is used, with what it is given', () => {
      const view = mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="Sign in">
          <p>Inside</p>
        </ModalWrapper>,
      );

      expect(view.container.innerHTML).toBe('');
      expect(theDialog().parentElement?.parentElement).toBe(document.body);
      expect(theDialog().textContent).toBe('Inside');
    });

    it('is a modal dialog for assistive technology', () => {
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="Sign in">
          x
        </ModalWrapper>,
      );

      expect(theDialog().getAttribute('role')).toBe('dialog');
      expect(theDialog().getAttribute('aria-modal')).toBe('true');
    });

    it('can be an alertdialog', () => {
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x" role="alertdialog">
          x
        </ModalWrapper>,
      );

      expect(theDialog().getAttribute('role')).toBe('alertdialog');
    });

    it('draws nothing on a server: the document is not there, and the first draw in the browser is the same', () => {
      expect(
        renderToString(
          <ModalWrapper isOpen onClose={vi.fn()} label="x">
            x
          </ModalWrapper>,
        ),
      ).toBe('');
    });

    it('shows when it is opened later, and goes when it is closed', () => {
      const view = mount(
        <ModalWrapper isOpen={false} onClose={vi.fn()} label="x">
          x
        </ModalWrapper>,
      );

      view.rerender(
        <ModalWrapper isOpen onClose={vi.fn()} label="x">
          x
        </ModalWrapper>,
      );
      expect(dialog()).not.toBeNull();

      view.rerender(
        <ModalWrapper isOpen={false} onClose={vi.fn()} label="x">
          x
        </ModalWrapper>,
      );
      expect(dialog()).toBeNull();
    });

    it('is left alone by StrictMode', () => {
      const view = mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x">
          <button type="button">in</button>
        </ModalWrapper>,
        { strict: true },
      );

      expect(document.querySelectorAll('[aria-modal="true"]')).toHaveLength(1);
      expect(document.body.style.overflow).toBe('hidden');

      view.unmount();

      expect(document.body.style.overflow).toBe('');
      expect(dialog()).toBeNull();
    });

    it('puts what it is given on the box and on the backdrop', () => {
      const onClick = vi.fn();

      mount(
        <ModalWrapper
          isOpen
          onClose={vi.fn()}
          label="x"
          className="box-class"
          style={{ width: '123px' }}
          containerProps={{ className: 'backdrop-class', id: 'backdrop', onClick }}
        >
          x
        </ModalWrapper>,
      );

      expect(theDialog().className).toContain('box-class');
      expect(theDialog().style.width).toBe('123px');
      expect(backdrop().className).toContain('backdrop-class');
      expect(backdrop().className).toContain('fixed inset-0');
      expect(backdrop().id).toBe('backdrop');

      click(backdrop());
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('its name', () => {
    it('is the title', () => {
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} header={{ title: 'Add a brand' }}>
          x
        </ModalWrapper>,
      );
      const title = required(theDialog().querySelector('h2'), 'the title');

      expect(title.textContent).toBe('Add a brand');
      expect(theDialog().getAttribute('aria-labelledby')).toBe(title.id);
      expect(theDialog().hasAttribute('aria-label')).toBe(false);
    });

    it('is the label when there is no title', () => {
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="Sign in">
          x
        </ModalWrapper>,
      );

      expect(theDialog().getAttribute('aria-label')).toBe('Sign in');
      expect(theDialog().hasAttribute('aria-labelledby')).toBe(false);
    });

    it('is the label when the header is only the close button', () => {
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="Sign in" header={{ showCloseIcon: true }}>
          x
        </ModalWrapper>,
      );

      expect(theDialog().getAttribute('aria-label')).toBe('Sign in');
      expect(theDialog().querySelector('h2')).toBeNull();
    });

    it('is the element it is told to take it from, over the title', () => {
      mount(
        <ModalWrapper
          isOpen
          onClose={vi.fn()}
          labelledBy="my-name"
          header={{ title: 'Ignored' }}
          label="Ignored too"
        >
          x
        </ModalWrapper>,
      );

      expect(theDialog().getAttribute('aria-labelledby')).toBe('my-name');
      expect(theDialog().hasAttribute('aria-label')).toBe(false);
    });

    it('has a description when it is told what it is', () => {
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x" describedBy="why">
          x
        </ModalWrapper>,
      );

      expect(theDialog().getAttribute('aria-describedby')).toBe('why');
    });

    it('has no description attribute otherwise', () => {
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x">
          x
        </ModalWrapper>,
      );

      expect(theDialog().hasAttribute('aria-describedby')).toBe(false);
    });

    it('gives each dialog its own title id', () => {
      mount(
        <>
          <ModalWrapper isOpen onClose={vi.fn()} header={{ title: 'One' }}>
            x
          </ModalWrapper>
          <ModalWrapper isOpen onClose={vi.fn()} header={{ title: 'Two' }}>
            x
          </ModalWrapper>
        </>,
      );
      const ids = [...document.querySelectorAll('h2')].map((title) => title.id);

      expect(ids).toHaveLength(2);
      expect(new Set(ids).size).toBe(2);
    });
  });

  describe('the header', () => {
    it('is not there without a title and a close button', () => {
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x">
          x
        </ModalWrapper>,
      );

      expect(document.querySelector('h2')).toBeNull();
      expect(document.querySelector('button')).toBeNull();
    });

    it('has a close button that closes', () => {
      const onClose = vi.fn();

      mount(
        <ModalWrapper isOpen onClose={onClose} label="x" header={{ showCloseIcon: true }}>
          x
        </ModalWrapper>,
      );
      click(buttonNamed('Close'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('names the close button in the language of the app', () => {
      mount(
        <ModalWrapper
          isOpen
          onClose={vi.fn()}
          label="x"
          header={{ showCloseIcon: true }}
          closeLabel="Band karo"
        >
          x
        </ModalWrapper>,
      );

      expect(buttonNamed('Band karo').getAttribute('type')).toBe('button');
    });

    it('has a title with a close button', () => {
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} header={{ title: 'Title', showCloseIcon: true }}>
          x
        </ModalWrapper>,
      );

      expect(document.querySelector('h2')?.textContent).toBe('Title');
      expect(buttonNamed('Close')).toBeTruthy();
    });

    it('has no close button when it is not asked for, whatever the title', () => {
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} header={{ title: 'Title' }}>
          x
        </ModalWrapper>,
      );

      expect(document.querySelector('button')).toBeNull();
    });
  });

  describe('closing', () => {
    it('is asked for by Escape', () => {
      const onClose = vi.fn();

      mount(
        <ModalWrapper isOpen onClose={onClose} label="x">
          x
        </ModalWrapper>,
      );
      keyDown(document, 'Escape');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('is not asked for by other keys', () => {
      const onClose = vi.fn();

      mount(
        <ModalWrapper isOpen onClose={onClose} label="x">
          x
        </ModalWrapper>,
      );
      keyDown(document, 'Enter');

      expect(onClose).not.toHaveBeenCalled();
    });

    it('is not asked for by Escape once the dialog is closed', () => {
      const onClose = vi.fn();
      const view = mount(
        <ModalWrapper isOpen onClose={onClose} label="x">
          x
        </ModalWrapper>,
      );

      view.rerender(
        <ModalWrapper isOpen={false} onClose={onClose} label="x">
          x
        </ModalWrapper>,
      );
      keyDown(document, 'Escape');

      expect(onClose).not.toHaveBeenCalled();
    });

    it('is asked for by the press of the backdrop', () => {
      const onClose = vi.fn();

      mount(
        <ModalWrapper isOpen onClose={onClose} label="x">
          x
        </ModalWrapper>,
      );
      pressAndClick(backdrop());

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('is not asked for by the press of the backdrop, when it is told not to', () => {
      const onClose = vi.fn();

      mount(
        <ModalWrapper isOpen onClose={onClose} label="x" closeOnOutsideClick={false}>
          x
        </ModalWrapper>,
      );
      pressAndClick(backdrop());

      expect(onClose).not.toHaveBeenCalled();
    });

    it('is not asked for by a press in the dialog', () => {
      const onClose = vi.fn();

      mount(
        <ModalWrapper isOpen onClose={onClose} label="x">
          <p>text</p>
        </ModalWrapper>,
      );
      pressAndClick(theDialog());
      pressAndClick(required(theDialog().querySelector('p'), 'the text'));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('is not asked for when a press starts in the dialog and ends on the backdrop (a drag to select text)', () => {
      const onClose = vi.fn();

      mount(
        <ModalWrapper isOpen onClose={onClose} label="x">
          <p>text</p>
        </ModalWrapper>,
      );
      press(required(theDialog().querySelector('p'), 'the text'));
      click(backdrop());

      expect(onClose).not.toHaveBeenCalled();
    });

    it('forgets a press once the click that ended it is over', () => {
      const onClose = vi.fn();

      mount(
        <ModalWrapper isOpen onClose={onClose} label="x">
          x
        </ModalWrapper>,
      );
      pressAndClick(backdrop());
      click(backdrop()); // a click that no press started

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('is not asked for by a click in the dialog, even after a press on the backdrop', () => {
      const onClose = vi.fn();

      mount(
        <ModalWrapper isOpen onClose={onClose} label="x">
          <p>text</p>
        </ModalWrapper>,
      );
      press(backdrop());
      click(required(theDialog().querySelector('p'), 'the text'));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('still tells the app about the presses of the backdrop that it listens for', () => {
      const onPointerDown = vi.fn();
      const onClick = vi.fn();

      mount(
        <ModalWrapper
          isOpen
          onClose={vi.fn()}
          label="x"
          containerProps={{ onPointerDown, onClick }}
        >
          x
        </ModalWrapper>,
      );
      pressAndClick(backdrop());

      expect(onPointerDown).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('uses the newest onClose, not the one it started with', () => {
      const first = vi.fn();
      const second = vi.fn();
      const view = mount(
        <ModalWrapper isOpen onClose={first} label="x">
          x
        </ModalWrapper>,
      );

      view.rerender(
        <ModalWrapper isOpen onClose={second} label="x">
          x
        </ModalWrapper>,
      );
      keyDown(document, 'Escape');

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('closes only the dialog on top with Escape, then the one below with the next', () => {
      const onCloseBelow = vi.fn();
      const onCloseTop = vi.fn();

      mount(
        <>
          <ModalWrapper isOpen onClose={onCloseBelow} label="below">
            x
          </ModalWrapper>
          <ModalWrapper isOpen onClose={onCloseTop} label="top">
            x
          </ModalWrapper>
        </>,
      );
      keyDown(document, 'Escape');

      expect(onCloseTop).toHaveBeenCalledTimes(1);
      expect(onCloseBelow).not.toHaveBeenCalled();
    });
  });

  describe('the page behind', () => {
    it('cannot be scrolled while it is open, and can again after', () => {
      const view = mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x">
          x
        </ModalWrapper>,
      );
      expect(document.body.style.overflow).toBe('hidden');

      view.rerender(
        <ModalWrapper isOpen={false} onClose={vi.fn()} label="x">
          x
        </ModalWrapper>,
      );

      expect(document.body.style.overflow).toBe('');
    });

    it('can be scrolled again after the dialog was removed while open', () => {
      const view = mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x">
          x
        </ModalWrapper>,
      );

      view.unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('the focus', () => {
    const opener = () => {
      const button = document.createElement('button');

      button.textContent = 'opener';
      document.body.append(button);
      button.focus();

      return button;
    };

    it('goes to the first thing in the dialog when it opens', () => {
      opener();
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x">
          <input aria-label="name" />
          <button type="button">ok</button>
        </ModalWrapper>,
      );

      expect(document.activeElement).toBe(theDialog().querySelector('input'));
    });

    it('goes to the close button first when there is one: it comes first', () => {
      opener();
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x" header={{ showCloseIcon: true }}>
          <button type="button">ok</button>
        </ModalWrapper>,
      );

      expect(document.activeElement).toBe(buttonNamed('Close'));
    });

    it('goes to the dialog itself when there is nothing in it to focus', () => {
      opener();
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x">
          <p>text</p>
        </ModalWrapper>,
      );

      expect(document.activeElement).toBe(theDialog());
    });

    it('goes where it is told to', () => {
      const Probe = () => {
        const target = useRef<HTMLButtonElement | null>(null);

        return (
          <ModalWrapper isOpen onClose={vi.fn()} label="x" initialFocus={target}>
            <button type="button">first</button>
            <button type="button" ref={target}>
              chosen
            </button>
          </ModalWrapper>
        );
      };

      opener();
      mount(<Probe />);

      expect(document.activeElement).toBe(buttonNamed('chosen'));
    });

    it('goes back to what had it before, when it closes', () => {
      const before = opener();
      const view = mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x">
          <button type="button">ok</button>
        </ModalWrapper>,
      );
      expect(document.activeElement).toBe(buttonNamed('ok'));

      view.rerender(
        <ModalWrapper isOpen={false} onClose={vi.fn()} label="x">
          <button type="button">ok</button>
        </ModalWrapper>,
      );

      expect(document.activeElement).toBe(before);
    });

    it('stays inside with Tab and Shift + Tab', () => {
      opener();
      mount(
        <ModalWrapper isOpen onClose={vi.fn()} label="x">
          <button type="button">one</button>
          <button type="button">two</button>
        </ModalWrapper>,
      );

      buttonNamed('two').focus();
      keyDown(document, 'Tab');
      expect(document.activeElement).toBe(buttonNamed('one'));

      keyDown(document, 'Tab', { shiftKey: true });
      expect(document.activeElement).toBe(buttonNamed('two'));
    });

    it('works with a dialog that opens another: the focus goes to the top one and back', () => {
      const Both = () => {
        const [inner, setInner] = useState(false);

        return (
          <>
            <ModalWrapper isOpen onClose={vi.fn()} label="outer">
              <button
                type="button"
                onClick={() => {
                  setInner(true);
                }}
              >
                open inner
              </button>
            </ModalWrapper>
            <ModalWrapper
              isOpen={inner}
              onClose={() => {
                setInner(false);
              }}
              label="inner"
              header={{ showCloseIcon: true }}
            >
              <p>inner</p>
            </ModalWrapper>
          </>
        );
      };

      opener();
      mount(<Both />);
      const openInner = buttonNamed('open inner');

      click(openInner);
      expect(document.activeElement).toBe(buttonNamed('Close'));

      click(buttonNamed('Close'));

      expect(document.activeElement).toBe(openInner);
      expect(document.body.style.overflow).toBe('hidden'); // the outer one still holds the page
    });
  });

  it('shows its content in a scrolling area that keeps the dialog inside the window', () => {
    mount(
      <ModalWrapper isOpen onClose={vi.fn()} label="x">
        <p>text</p>
      </ModalWrapper>,
    );

    expect(theDialog().className).toContain('max-h-[90dvh]');
    expect(theDialog().querySelector('p')?.textContent).toBe('text');
  });

  it('can be closed by the app with a state, like any other', () => {
    const App = () => {
      const [open, setOpen] = useState(true);

      return (
        <ModalWrapper
          isOpen={open}
          onClose={() => {
            setOpen(false);
          }}
          label="x"
          header={{ showCloseIcon: true }}
        >
          x
        </ModalWrapper>
      );
    };

    mount(<App />);
    expect(dialog()).not.toBeNull();

    act(() => {
      buttonNamed('Close').click();
    });

    expect(dialog()).toBeNull();
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without what it needs, or with a role that does not exist', () => {
    const check = () => {
      // @ts-expect-error it needs to know if it is open
      <ModalWrapper onClose={() => undefined}>x</ModalWrapper>;
      // @ts-expect-error and what to do to close
      <ModalWrapper isOpen>x</ModalWrapper>;
      // @ts-expect-error and a content
      <ModalWrapper isOpen onClose={() => undefined} />;
      // @ts-expect-error the role is dialog or alertdialog
      <ModalWrapper isOpen onClose={() => undefined} role="menu">
        x
      </ModalWrapper>;
    };

    expect(check).toBeTypeOf('function');
  });
});
