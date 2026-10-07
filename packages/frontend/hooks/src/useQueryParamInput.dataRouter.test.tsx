import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { resetPendingSearch } from './pending-search.js';
import { useQueryParamInput } from './useQueryParamInput.js';
import { useQueryParams } from './useQueryParams.js';

// The apps use a *data router* (`createBrowserRouter`): `navigate()` is asynchronous there - the new
// URL is only committed a moment later. These tests use real timers: a short debounce and a loader
// that makes every navigation take ~30ms, like the apps' routes (middleware, lazy pages).
const DELAY = 40;
const NAVIGATION_MS = 30;

const setup = (entry: string, delay = DELAY) => {
  const exposed: {
    input?: ReturnType<typeof useQueryParamInput>;
    filters?: ReturnType<typeof useQueryParams>;
  } = {};
  // every value the box rendered with, in order
  const seen: string[] = [];

  // a second component that also uses the URL, like the status select next to a search box
  const Filters = () => {
    exposed.filters = useQueryParams();
    return null;
  };

  const Probe = () => {
    exposed.input = useQueryParamInput('search', { delay });
    seen.push(exposed.input.value);
    return <Filters />;
  };

  const router = createMemoryRouter(
    [
      {
        path: '*',
        Component: Probe,
        loader: async () => {
          await new Promise((resolve) => setTimeout(resolve, NAVIGATION_MS));
          return null;
        },
      },
    ],
    { initialEntries: [entry] },
  );
  render(<RouterProvider router={router} />);

  const input = () => {
    if (!exposed.input) throw new Error('hook not rendered yet');
    return exposed.input;
  };

  const filters = () => {
    if (!exposed.filters) throw new Error('hook not rendered yet');
    return exposed.filters;
  };

  const settled = () =>
    waitFor(() => {
      expect(router.state.initialized).toBe(true);
      expect(router.state.navigation.state).toBe('idle');
      expect(exposed.input).toBeDefined();
      expect(exposed.filters).toBeDefined();
    });

  const navigating = () =>
    waitFor(() => {
      expect(router.state.navigation.state).toBe('loading');
    });

  return { router, input, filters, settled, navigating, seen };
};

describe('useQueryParamInput with a data router (async navigation)', () => {
  afterEach(() => {
    resetPendingSearch();
  });

  it('writes the text to the URL once the navigation has committed', async () => {
    const { router, input, settled } = setup('/products?sortBy=name');
    await settled();

    act(() => {
      input().setValue('lip');
    });
    await waitFor(() => {
      expect(router.state.location.search).toBe('?sortBy=name&search=lip');
    });

    expect(input().value).toBe('lip');
  });

  it('what the user types while their own URL update is committing is not overwritten', async () => {
    const { router, input, settled, navigating, seen } = setup('/products');
    await settled();

    act(() => {
      input().setValue('abc');
    });
    await navigating(); // the debounce fired: the URL update for "abc" is in flight
    act(() => {
      input().setValue('abcd');
    });
    await waitFor(() => {
      expect(router.state.location.search).toBe('?search=abcd');
    });
    await settled();

    expect(input().value).toBe('abcd');
    // after "abcd" was typed the box never went back to showing "abc"
    expect(seen.slice(seen.indexOf('abcd'))).not.toContain('abc');
  });

  it('keeps a trailing space after its own URL update comes back', async () => {
    const { router, input, settled } = setup('/products');
    await settled();

    act(() => {
      input().setValue('lip ');
    });
    await waitFor(() => {
      expect(router.state.location.search).toBe('?search=lip');
    });
    await settled();

    expect(input().value).toBe('lip ');
  });

  describe('together with another component that updates the URL', () => {
    it('a status picked in the same moment as the text is typed: both end up in the URL', async () => {
      const { router, input, filters, settled } = setup('/products?sortBy=name');
      await settled();

      act(() => {
        filters().setParams({ status: 'active' });
        input().setValue('abc');
      });
      await waitFor(() => {
        expect(router.state.location.search).toBe('?sortBy=name&status=active&search=abc');
      });
    });

    it('a status picked while the search update is in flight: both end up in the URL', async () => {
      const { router, input, filters, settled, navigating } = setup('/products?sortBy=name');
      await settled();

      act(() => {
        input().setValue('abc');
      });
      await navigating(); // the search update is on its way
      act(() => {
        filters().setParams({ status: 'active' });
      });
      await settled();

      expect(router.state.location.search).toBe('?sortBy=name&search=abc&status=active');
    });

    it('a status picked just before the debounce fires: both end up in the URL', async () => {
      const { router, input, filters, settled } = setup('/products?sortBy=name');
      await settled();

      act(() => {
        input().setValue('abc');
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, DELAY - 10));
      });
      act(() => {
        filters().setParams({ status: 'active' });
      });
      await waitFor(() => {
        expect(router.state.location.search).toContain('search=abc');
        expect(router.state.location.search).toContain('status=active');
      });
    });
  });

  it('follows a URL change that happens while typed text is waiting, and drops that text', async () => {
    // a long debounce: the other URL must have landed (navigation + render) well before it fires, even on a busy machine
    const longDelay = 400;
    const { router, input, settled } = setup('/products?search=old', longDelay);
    await settled();

    act(() => {
      input().setValue('new');
    });
    await act(async () => {
      await router.navigate('/products?search=other');
    });
    await new Promise((resolve) => setTimeout(resolve, longDelay * 2));
    await settled();

    expect(input().value).toBe('other');
    expect(router.state.location.search).toBe('?search=other');
  });

  // Fast typing with a navigation that takes about as long as the debounce: several updates are on
  // their way at once, and the router may commit an older one after a newer one was sent. Whatever
  // the timing, the box must never show older text than what was typed, and the last text must win.
  it.each([1, 2, 3])(
    'fast typing (seed %i): the box never goes back and the last text wins',
    async (seed) => {
      let state = seed * 7919;
      const random = () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      };

      const { router, input, settled, seen } = setup('/products');
      await settled();

      const typed: string[] = [];
      let text = '';
      for (let i = 0; i < 20; i++) {
        text += String.fromCharCode(97 + (i % 26));
        typed.push(text);
        act(() => {
          input().setValue(text);
        });
        const gap = Math.floor(random() * 90); // around the debounce (40ms) and the navigation (30ms)
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, gap));
        });
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, DELAY * 4));
      });
      await settled();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, DELAY * 3));
      });

      const shown = seen.filter((value) => value !== '').map((value) => typed.indexOf(value));
      expect(shown.every((index) => index >= 0)).toBe(true);
      expect(shown).toEqual([...shown].sort((a, b) => a - b));
      expect(input().value).toBe(text);
      expect(router.state.location.search).toBe(`?search=${text}`);
    },
    30_000,
  );

  describe('clear while a URL update of its own is on its way', () => {
    it('ends with the box showing what the URL ended up with', async () => {
      const { router, input, settled, navigating } = setup('/products');
      await settled();

      act(() => {
        input().setValue('abc');
      });
      await navigating(); // "abc" is on its way to the URL
      act(() => {
        input().clear(); // clear() never touches the URL, so "abc" still lands...
      });
      await settled();

      expect(router.state.location.search).toBe('?search=abc');
      expect(input().value).toBe('abc'); // ...and the box must not disagree with it
    });

    it('stays empty when the URL is cleared together with the box (a "Clear" button)', async () => {
      const { router, input, filters, settled, navigating } = setup('/products');
      await settled();

      act(() => {
        input().setValue('abc');
      });
      await navigating();
      act(() => {
        input().clear();
        filters().clearParams();
      });
      await settled();
      await new Promise((resolve) => setTimeout(resolve, DELAY * 3));

      expect(router.state.location.search).toBe('');
      expect(input().value).toBe('');
    });
  });

  it('is emptied by a status change that removes the param, without writing anything back', async () => {
    const { router, input, filters, settled } = setup('/products?search=lipstick&sortBy=name');
    await settled();
    expect(input().value).toBe('lipstick');

    act(() => {
      filters().removeParams(['search']);
      filters().setParams({ status: 'draft' });
    });
    await settled();
    await new Promise((resolve) => setTimeout(resolve, DELAY * 3));

    expect(router.state.location.search).toBe('?sortBy=name&status=draft');
    expect(input().value).toBe('');
  });
});
