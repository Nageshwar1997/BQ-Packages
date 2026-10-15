// @vitest-environment jsdom
import { createPortal } from 'react-dom';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { press, pressKey, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { type IDismissOptions, useDismiss } from './useDismiss.js';

type TOnDismiss = Parameters<typeof useDismiss>[0];

const Popup = ({
  onDismiss,
  options,
  label = 'popup',
}: {
  onDismiss: TOnDismiss;
  options?: IDismissOptions;
  label?: string;
}) => {
  const ref = useDismiss<HTMLDivElement>(onDismiss, options);

  return (
    <div ref={ref} data-testid={label}>
      <button type="button">{label} inside</button>
    </div>
  );
};

const Portalled = ({ onDismiss }: { onDismiss: TOnDismiss }) => {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const ref = useDismiss<HTMLDivElement>(onDismiss, {
    ignore: [popupRef],
  });

  return (
    <div ref={ref}>
      <button type="button">trigger</button>
      {createPortal(
        <div ref={popupRef}>
          <button type="button">portalled option</button>
        </div>,
        document.body,
      )}
    </div>
  );
};

const outsideButton = () => {
  const button = document.createElement('button');

  document.body.append(button);

  return button;
};

describe('useDismiss', () => {
  afterEach(() => {
    unmountAll();
    document.body.replaceChildren();
  });

  describe('a press', () => {
    it('outside the popup dismisses it, and says it was outside', () => {
      const onDismiss = vi.fn();
      mount(<Popup onDismiss={onDismiss} />);

      press(outsideButton());

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onDismiss.mock.calls[0]?.[0]).toBe('outside');
    });

    it('inside the popup does not', () => {
      const onDismiss = vi.fn();
      const view = mount(<Popup onDismiss={onDismiss} />);

      press(required(view.container.querySelector('button')));
      press(required(view.container.querySelector('[data-testid]')));

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('is seen even when something inside stops it from bubbling', () => {
      const onDismiss = vi.fn();
      mount(<Popup onDismiss={onDismiss} />);
      const other = outsideButton();
      other.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });

      press(other);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('on a popup that is portalled out of the element is not outside, when it is in `ignore`', () => {
      const onDismiss = vi.fn();
      mount(<Portalled onDismiss={onDismiss} />);
      const option = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'portalled option',
      );

      press(option as Element);

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('on the portalled popup is outside when it is not in `ignore`', () => {
      const onDismiss = vi.fn();
      const PortalledWithout = () => {
        const ref = useDismiss<HTMLDivElement>(onDismiss);

        return (
          <div ref={ref}>
            {createPortal(<button type="button">portalled</button>, document.body)}
          </div>
        );
      };
      mount(<PortalledWithout />);

      press(
        [...document.querySelectorAll('button')].find(
          (b) => b.textContent === 'portalled',
        ) as Element,
      );

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does nothing when `outside` is false', () => {
      const onDismiss = vi.fn();
      mount(<Popup onDismiss={onDismiss} options={{ outside: false }} />);

      press(outsideButton());

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Escape', () => {
    it('dismisses, and says it was Escape', () => {
      const onDismiss = vi.fn();
      mount(<Popup onDismiss={onDismiss} />);

      pressKey('Escape');

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onDismiss.mock.calls[0]?.[0]).toBe('escape');
    });

    it('is the only key that dismisses', () => {
      const onDismiss = vi.fn();
      mount(<Popup onDismiss={onDismiss} />);

      for (const key of ['Enter', 'Esc', 'a', ' ', 'Tab']) pressKey(key);

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('does nothing when `escape` is false', () => {
      const onDismiss = vi.fn();
      mount(<Popup onDismiss={onDismiss} options={{ escape: false }} />);

      pressKey('Escape');

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('is left alone when something already handled it', () => {
      const onDismiss = vi.fn();
      mount(<Popup onDismiss={onDismiss} />);
      document.addEventListener(
        'keydown',
        (event) => {
          event.preventDefault();
        },
        { once: true, capture: true },
      );

      pressKey('Escape');

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('reaches only the popup that opened last: the one inside closes first', () => {
      const outer = vi.fn();
      const inner = vi.fn();
      const view = mount(
        <>
          <Popup onDismiss={outer} label="outer" />
          <Popup onDismiss={inner} label="inner" options={{ enabled: false }} />
        </>,
      );

      // the inner popup opens after the outer one
      view.rerender(
        <>
          <Popup onDismiss={outer} label="outer" />
          <Popup onDismiss={inner} label="inner" />
        </>,
      );
      pressKey('Escape');

      expect(inner).toHaveBeenCalledTimes(1);
      expect(outer).not.toHaveBeenCalled();

      // once it is closed the outer one is the one on top
      view.rerender(
        <>
          <Popup onDismiss={outer} label="outer" />
          <Popup onDismiss={inner} label="inner" options={{ enabled: false }} />
        </>,
      );
      pressKey('Escape');

      expect(outer).toHaveBeenCalledTimes(1);
      expect(inner).toHaveBeenCalledTimes(1);
    });
  });

  describe('a popup that does not listen for Escape', () => {
    it('does not keep Escape from the popup that is below it', () => {
      const outer = vi.fn();
      const inner = vi.fn();

      mount(
        <>
          <Popup onDismiss={outer} label="outer" />
          <Popup onDismiss={inner} label="inner" options={{ escape: false }} />
        </>,
      );

      pressKey('Escape');

      expect(inner).not.toHaveBeenCalled();
      expect(outer).toHaveBeenCalledTimes(1);
    });
  });

  describe('when it is switched off', () => {
    it('hears nothing', () => {
      const onDismiss = vi.fn();
      mount(<Popup onDismiss={onDismiss} options={{ enabled: false }} />);

      press(outsideButton());
      pressKey('Escape');

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('hears again once it is switched on, and not after it is switched off', () => {
      const onDismiss = vi.fn();
      const view = mount(<Popup onDismiss={onDismiss} options={{ enabled: false }} />);

      view.rerender(<Popup onDismiss={onDismiss} options={{ enabled: true }} />);
      pressKey('Escape');
      expect(onDismiss).toHaveBeenCalledTimes(1);

      view.rerender(<Popup onDismiss={onDismiss} options={{ enabled: false }} />);
      pressKey('Escape');
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('in React', () => {
    it('calls the callback of the last render, with no listener added again', () => {
      const add = vi.spyOn(document, 'addEventListener');
      const first = vi.fn();
      const second = vi.fn();
      const view = mount(<Popup onDismiss={first} />);
      const added = add.mock.calls.length;

      view.rerender(<Popup onDismiss={second} />);
      pressKey('Escape');

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
      expect(add.mock.calls.length).toBe(added);
      add.mockRestore();
    });

    it('leaves no listener behind when it is removed', () => {
      const remove = vi.spyOn(document, 'removeEventListener');
      const onDismiss = vi.fn();
      const view = mount(<Popup onDismiss={onDismiss} />);

      view.unmount();
      press(outsideButton());
      pressKey('Escape');

      expect(onDismiss).not.toHaveBeenCalled();
      expect(remove.mock.calls.map(([type]) => type).sort()).toEqual(['keydown', 'pointerdown']);
      remove.mockRestore();
    });

    it('is the same in StrictMode: one call per press', () => {
      const onDismiss = vi.fn();
      mount(<Popup onDismiss={onDismiss} />, { strict: true });

      pressKey('Escape');
      press(outsideButton());

      expect(onDismiss).toHaveBeenCalledTimes(2);
    });

    it('lets the popup that is removed leave the stack: the next Escape goes to the one below', () => {
      const outer = vi.fn();
      const inner = vi.fn();
      const view = mount(
        <>
          <Popup onDismiss={outer} label="outer" />
          <Popup onDismiss={inner} label="inner" />
        </>,
      );

      view.rerender(<Popup onDismiss={outer} label="outer" />);
      pressKey('Escape');

      expect(outer).toHaveBeenCalledTimes(1);
      expect(inner).not.toHaveBeenCalled();
    });
  });
});
