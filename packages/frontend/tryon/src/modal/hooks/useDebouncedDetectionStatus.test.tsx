// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TDetectionStatus } from '../../types/index.js';
import { renderHook, unmountAll } from '../../test-utils/react.js';
import useDebouncedDetectionStatus, {
  DETECTION_GUIDE_DEBOUNCE_MS,
} from './useDebouncedDetectionStatus.js';

let raw: TDetectionStatus | undefined;

const setup = (initial?: TDetectionStatus) => {
  raw = initial;

  const view = renderHook(() => useDebouncedDetectionStatus(raw));
  const reading = (next: TDetectionStatus | undefined) => {
    raw = next;
    view.rerender();
  };
  const wait = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };

  return { view, reading, wait };
};

describe('useDebouncedDetectionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    unmountAll();
    vi.useRealTimers();
  });

  it('has no reading until it is given one', () => {
    const { view } = setup();

    expect(view.result.current).toBeUndefined();
  });

  it('gives "detected" at once: nothing has to hold for the good news', () => {
    const { view, reading } = setup();

    reading('detected');

    expect(view.result.current).toBe('detected');
  });

  it('holds a problem back until it has lasted for 1.5 seconds', () => {
    const { view, reading, wait } = setup('detected');

    reading('not-in-frame');
    expect(view.result.current).toBe('detected');

    wait(DETECTION_GUIDE_DEBOUNCE_MS - 1);
    expect(view.result.current).toBe('detected');

    wait(1);
    expect(view.result.current).toBe('not-in-frame');
  });

  it('is 1.5 seconds', () => {
    expect(DETECTION_GUIDE_DEBOUNCE_MS).toBe(1500);
  });

  it('never shows a problem that went away before it lasted long enough', () => {
    const { view, reading, wait } = setup('detected');

    reading('turned');
    wait(1000);
    reading('detected');
    wait(5000);

    // the timer that was running must not fire later and bring the warning back
    expect(view.result.current).toBe('detected');
  });

  it('starts counting again when the problem is another one', () => {
    const { view, reading, wait } = setup('detected');

    reading('not-in-frame');
    wait(1000);
    reading('not-clear');
    wait(1000); // 2 seconds since the first, 1 since the second
    expect(view.result.current).toBe('detected');

    wait(500);
    expect(view.result.current).toBe('not-clear');
  });

  it('lets go of the warning at once when the reading goes away (a mode or model switch)', () => {
    const { view, reading, wait } = setup('detected');

    reading('not-in-frame');
    wait(2000);
    expect(view.result.current).toBe('not-in-frame');

    reading(undefined);
    expect(view.result.current).toBeUndefined();
    wait(5000);
    expect(view.result.current).toBeUndefined();
  });

  it('keeps one timer for a problem that goes on: the same reading again does not restart it', () => {
    const { view, reading, wait } = setup('detected');

    reading('not-in-frame');
    wait(1000);
    view.rerender(); // the same reading, another render
    wait(500);

    expect(view.result.current).toBe('not-in-frame');
  });

  it('leaves no timer behind when it is removed', () => {
    const { view, reading } = setup('detected');

    reading('not-in-frame');
    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
