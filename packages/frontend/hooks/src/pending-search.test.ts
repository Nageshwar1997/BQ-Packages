import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PENDING_SEARCH_MAX_AGE_MS,
  readPendingSearch,
  resetPendingSearch,
  setPendingSearch,
  settlePendingSearch,
} from './pending-search.js';

describe('pending search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPendingSearch();
  });

  afterEach(() => {
    resetPendingSearch();
    vi.useRealTimers();
  });

  it('is empty until a navigation is started', () => {
    expect(readPendingSearch('/products')).toBeNull();
  });

  it('remembers the query string a navigation is heading to', () => {
    setPendingSearch('/products', 'status=active');

    expect(readPendingSearch('/products')).toBe('status=active');
  });

  it('can be an empty query string (a cleared URL is still a pending navigation)', () => {
    setPendingSearch('/products', '');

    expect(readPendingSearch('/products')).toBe('');
  });

  it('only applies to the pathname it was started on', () => {
    setPendingSearch('/products', 'status=active');

    expect(readPendingSearch('/categories')).toBeNull();
    expect(readPendingSearch('/products')).toBe('status=active');
  });

  it('keeps only the newest pending navigation', () => {
    setPendingSearch('/products', 'a=1');
    setPendingSearch('/products', 'a=1&b=2');

    expect(readPendingSearch('/products')).toBe('a=1&b=2');
  });

  it('is forgotten after the max age, so a lost navigation cannot stick forever', () => {
    setPendingSearch('/products', 'status=active');

    vi.advanceTimersByTime(PENDING_SEARCH_MAX_AGE_MS);
    expect(readPendingSearch('/products')).toBe('status=active');

    vi.advanceTimersByTime(1);
    expect(readPendingSearch('/products')).toBeNull();
  });

  it('a newer navigation restarts the clock', () => {
    setPendingSearch('/products', 'a=1');
    vi.advanceTimersByTime(PENDING_SEARCH_MAX_AGE_MS - 100);
    setPendingSearch('/products', 'a=1&b=2');
    vi.advanceTimersByTime(500);

    expect(readPendingSearch('/products')).toBe('a=1&b=2');
  });

  describe('settling', () => {
    it('clears the pending navigation once the router shows that query string', () => {
      setPendingSearch('/products', 'status=active');

      settlePendingSearch('/products', '?status=active');

      expect(readPendingSearch('/products')).toBeNull();
    });

    it('compares the normalised query strings, so a different encoding of the same URL settles it', () => {
      setPendingSearch('/products', 'name=red+lipstick');

      settlePendingSearch('/products', '?name=red%20lipstick');

      expect(readPendingSearch('/products')).toBeNull();
    });

    it('settles an empty pending query string against an empty URL', () => {
      setPendingSearch('/products', '');

      settlePendingSearch('/products', '');

      expect(readPendingSearch('/products')).toBeNull();
    });

    it('keeps the pending navigation when the router shows a different URL (an older one committing, Back...)', () => {
      setPendingSearch('/products', 'status=active&search=abc');

      settlePendingSearch('/products', '?status=active');

      expect(readPendingSearch('/products')).toBe('status=active&search=abc');
    });

    it('keeps the pending navigation when another pathname commits', () => {
      setPendingSearch('/products', 'status=active');

      settlePendingSearch('/categories', '?status=active');

      expect(readPendingSearch('/products')).toBe('status=active');
    });

    it('does nothing when there is nothing pending', () => {
      expect(() => {
        settlePendingSearch('/products', '?a=1');
      }).not.toThrow();
      expect(readPendingSearch('/products')).toBeNull();
    });
  });

  it('reset forgets the pending navigation', () => {
    setPendingSearch('/products', 'a=1');

    resetPendingSearch();

    expect(readPendingSearch('/products')).toBeNull();
  });
});
