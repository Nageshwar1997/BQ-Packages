import { act } from 'react';
import { vi } from 'vitest';

/** A ResizeObserver that jsdom does not have: the tests tell it when something was resized. */
export class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];

  observed: Element[] = [];
  disconnected = false;

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve(element: Element) {
    this.observed = this.observed.filter((observed) => observed !== element);
  }

  disconnect() {
    this.disconnected = true;
    this.observed = [];
  }

  /** What the browser does when the size of something that is observed changed. */
  trigger() {
    this.callback([], this);
  }
}

/** Puts `FakeResizeObserver` in place of the real one; call the returned function to remove it. */
export const installResizeObserver = () => {
  FakeResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);

  return {
    instances: FakeResizeObserver.instances,
    /** Every observer that is still watching. */
    active: () => FakeResizeObserver.instances.filter((observer) => !observer.disconnected),
    triggerAll: () => {
      act(() => {
        for (const observer of FakeResizeObserver.instances) observer.trigger();
      });
    },
  };
};

/** jsdom does no layout: this gives an element the size and scroll position a test wants. */
export const setScrollMetrics = (
  element: HTMLElement,
  metrics: Partial<
    Record<
      'clientWidth' | 'scrollWidth' | 'scrollLeft' | 'clientHeight' | 'scrollHeight' | 'scrollTop',
      number
    >
  >,
) => {
  for (const [key, value] of Object.entries(metrics)) {
    Object.defineProperty(element, key, { configurable: true, writable: true, value });
  }
};

/** Dispatches a press the way a browser does (for the listeners of `useDismiss`). */
export const press = (target: Element) => {
  act(() => {
    target.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
  });
};

/** Presses a key on the document. */
export const pressKey = (key: string, target: Element | Document = document) => {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
};

/** The thing a test is about to use, or a clear failure when it is not there (instead of a `!`). */
export const required = <T>(value: T | null | undefined, what = 'the element'): T => {
  if (value === null || value === undefined) throw new Error(`${what} is not on the page`);

  return value;
};

/** Types into a field the way a person does: the value is set and the browser's `input` event fires. */
export const typeInto = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = Object.getPrototypeOf(element) as object;

  act(() => {
    // the setter of the prototype: React does not see a value that was set the plain way
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

/** A click (`element.click()` also switches a checkbox, as a real one does). */
export const click = (element: Element) => {
  act(() => {
    (element as HTMLElement).click();
  });
};

/** A key pressed on an element (the event bubbles, as a real one does). */
export const keyDown = (element: Element | Document, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });

  act(() => {
    element.dispatchEvent(event);
  });

  return event;
};

/** Moves the focus to an element, inside `act`. */
export const focus = (element: HTMLElement) => {
  act(() => {
    element.focus();
  });
};

/** Gives an element the place a browser would have measured for it (jsdom does no layout). */
export const setRect = (
  element: Element,
  rect: Partial<Record<'top' | 'bottom' | 'left' | 'right' | 'width' | 'height', number>>,
) => {
  const full = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, ...rect };

  element.getBoundingClientRect = () => ({ ...full, toJSON: () => full });
};

/** The labels of a field, as an array (a field has none, one or several). */
export const labelsOf = (field: HTMLInputElement | HTMLTextAreaElement) => [
  ...(field.labels ?? []),
];
