// @vitest-environment jsdom
import type { RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { keyDown, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { sharedState } from './shared-state.js';

type TUseDismiss = (onDismiss: () => void, options: { enabled: boolean }) => RefObject<unknown>;
type TUseScrollLock = (enabled: boolean) => void;
type TUseFocusTrap = (options: { enabled: boolean }) => RefObject<HTMLDivElement | null>;

/*
 * The package is built one file per entry, and the code of `lib/` is copied into every entry that uses
 * it: the select of `/inputs` and the modal of `/layout` run the same code, but from two copies of it.
 * What has to be one for the page (the popups that are open, the traps that hold the focus, the
 * dialogs that hold the page still) therefore cannot be a variable of a module. These tests load a
 * module twice, which is what two copies are, and check that the copies agree.
 */

/** The same module loaded twice, as two copies of it (the second with the same React as the first). */
const twoCopies = async <T,>(load: () => Promise<T>) => {
  const react = await import('react');
  const first = await load();

  vi.resetModules();
  vi.doMock('react', () => react);

  const second = await load();

  vi.doUnmock('react');

  return [first, second] as const;
};

describe('sharedState', () => {
  it('makes the state the first time, and gives that same object after', () => {
    const create = vi.fn(() => ({ count: 0 }));

    const first = sharedState('test-once', create);
    const second = sharedState('test-once', create);

    expect(first).toBe(second);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('keeps one state for each name', () => {
    expect(sharedState('test-a', () => ({}))).not.toBe(sharedState('test-b', () => ({})));
  });

  it('is the same state in a copy of the module', async () => {
    const [first, second] = await twoCopies(() => import('./shared-state.js'));

    expect(first.sharedState).not.toBe(second.sharedState); // two copies of the code...
    expect(first.sharedState('test-copies', () => [])).toBe(
      second.sharedState('test-copies', () => []), // ...and one state
    );
  });
});

describe('two copies of useDismiss', () => {
  afterEach(() => {
    unmountAll();
    vi.resetModules();
  });

  it('close one popup at a time with Escape, the one that opened last first', async () => {
    const [{ useDismiss: dialogDismiss }, { useDismiss: selectDismiss }] = (await twoCopies(
      () => import('./useDismiss.js'),
    )) as unknown as [{ useDismiss: TUseDismiss }, { useDismiss: TUseDismiss }];

    expect(dialogDismiss).not.toBe(selectDismiss);

    const closeDialog = vi.fn();
    const closeSelect = vi.fn();
    const Popup = ({ use, onDismiss }: { use: TUseDismiss; onDismiss: () => void }) => {
      use(onDismiss, { enabled: true });

      return null;
    };

    // the dialog opens, then the select inside it
    mount(<Popup use={dialogDismiss} onDismiss={closeDialog} />);
    const select = mount(<Popup use={selectDismiss} onDismiss={closeSelect} />);

    keyDown(document, 'Escape');
    expect(closeSelect).toHaveBeenCalledTimes(1);
    expect(closeDialog).not.toHaveBeenCalled(); // it stays until the next Escape

    select.unmount();
    keyDown(document, 'Escape');
    expect(closeDialog).toHaveBeenCalledTimes(1);
  });
});

describe('two copies of useScrollLock', () => {
  beforeEach(() => {
    document.body.removeAttribute('style');
  });

  afterEach(() => {
    unmountAll();
    vi.resetModules();
    document.body.removeAttribute('style');
  });

  it('hold the page together, and give it back only when the last one lets go', async () => {
    const [{ useScrollLock: lockOfDialog }, { useScrollLock: lockOfOther }] = (await twoCopies(
      () => import('./useScrollLock.js'),
    )) as unknown as [{ useScrollLock: TUseScrollLock }, { useScrollLock: TUseScrollLock }];

    const Lock = ({ use }: { use: TUseScrollLock }) => {
      use(true);

      return null;
    };

    document.body.style.overflow = 'scroll';

    const dialog = mount(<Lock use={lockOfDialog} />);
    const other = mount(<Lock use={lockOfOther} />);
    expect(document.body.style.overflow).toBe('hidden');

    dialog.unmount();
    // the other copy still holds it: the page must not scroll yet
    expect(document.body.style.overflow).toBe('hidden');

    other.unmount();
    // and what the page had before the first one came back, not what it looked like after it
    expect(document.body.style.overflow).toBe('scroll');
  });
});

describe('two copies of useFocusTrap', () => {
  afterEach(() => {
    unmountAll();
    vi.resetModules();
  });

  it('let only the dialog on top keep the focus: the one below does not pull it back', async () => {
    const [{ useFocusTrap: trapOfOuter }, { useFocusTrap: trapOfInner }] = (await twoCopies(
      () => import('./useFocusTrap.js'),
    )) as unknown as [{ useFocusTrap: TUseFocusTrap }, { useFocusTrap: TUseFocusTrap }];

    const Dialog = ({ use, label }: { use: TUseFocusTrap; label: string }) => {
      const ref = use({ enabled: true });

      return (
        <div ref={ref} tabIndex={-1} aria-label={label}>
          <button type="button">{`${label} one`}</button>
          <button type="button">{`${label} two`}</button>
        </div>
      );
    };

    const outer = mount(<Dialog use={trapOfOuter} label="outer" />);
    const inner = mount(<Dialog use={trapOfInner} label="inner" />);

    const pulled = vi.fn();
    outer.container.addEventListener('focusin', pulled);

    // the focus is on the last thing of the dialog on top, and Tab goes on from there
    required(inner.container.querySelectorAll('button')[1]).focus();
    keyDown(document, 'Tab');

    expect(document.activeElement?.textContent).toBe('inner one'); // round to the first of its own dialog
    expect(pulled).not.toHaveBeenCalled(); // and the dialog below never took it
  });
});
