import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebounce } from './useDebounce.js';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the callback once, with the given args, after the delay', () => {
    const callback = vi.fn<(value: string, count: number) => void>();
    const { result } = renderHook(() => useDebounce({ callback, delay: 300 }));

    result.current.trigger('a', 1);

    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('a', 1);
  });

  it('defaults the delay to 500ms', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce({ callback }));

    result.current.trigger();

    vi.advanceTimersByTime(499);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('restarts the timer on every trigger and only fires the last call', () => {
    const callback = vi.fn<(value: string) => void>();
    const { result } = renderHook(() => useDebounce({ callback, delay: 200 }));

    result.current.trigger('first');
    vi.advanceTimersByTime(150);
    result.current.trigger('second');
    vi.advanceTimersByTime(150);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second');
  });

  it('cancel() drops the pending call', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce({ callback, delay: 100 }));

    result.current.trigger();
    result.current.cancel();
    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  it('cancel() with nothing pending is a no-op, and trigger() still works afterwards', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce({ callback, delay: 100 }));

    expect(() => {
      result.current.cancel();
    }).not.toThrow();

    result.current.trigger();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending call when the component unmounts', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebounce({ callback, delay: 100 }));

    result.current.trigger();
    unmount();
    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  it('keeps the same trigger/cancel references while callback and delay are unchanged', () => {
    const callback = vi.fn();
    const { result, rerender } = renderHook(() => useDebounce({ callback, delay: 100 }));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
    expect(result.current.trigger).toBe(first.trigger);
    expect(result.current.cancel).toBe(first.cancel);
  });

  it('uses the new callback for triggers made after the callback changes', () => {
    const oldCallback = vi.fn();
    const newCallback = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback }) => useDebounce({ callback, delay: 100 }),
      { initialProps: { callback: oldCallback } },
    );

    rerender({ callback: newCallback });
    result.current.trigger();
    vi.advanceTimersByTime(100);

    expect(oldCallback).not.toHaveBeenCalled();
    expect(newCallback).toHaveBeenCalledTimes(1);
  });
});
