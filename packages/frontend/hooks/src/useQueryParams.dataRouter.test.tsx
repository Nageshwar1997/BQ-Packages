import { act, render, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { resetPendingSearch } from './pending-search.js';
import { useQueryParams } from './useQueryParams.js';

// The apps use a *data router* (`createBrowserRouter`): `navigate()` is asynchronous there - the new
// URL is only committed a moment later, after the router has finished the navigation. The other
// test file uses `MemoryRouter`, where the update is committed together with the next render.
const setup = (entry: string) => {
  const exposed: {
    query?: ReturnType<typeof useQueryParams>;
    other?: ReturnType<typeof useQueryParams>;
    rerender?: () => void;
  } = {};

  // A second component using the hook, like a page with a filter bar and a search box that each
  // call useQueryParams() on their own.
  const Other = () => {
    exposed.other = useQueryParams();
    return null;
  };

  const Probe = () => {
    const [, force] = useState(0);
    exposed.rerender = () => {
      force((count) => count + 1);
    };
    exposed.query = useQueryParams();
    return <Other />;
  };

  const router = createMemoryRouter(
    [
      {
        path: '*',
        Component: Probe,
        // like the apps' routes (middleware, lazy pages): a navigation takes a few ms to commit
        loader: async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return null;
        },
      },
    ],
    { initialEntries: [entry] },
  );
  render(<RouterProvider router={router} />);

  const query = () => {
    if (!exposed.query) throw new Error('hook not rendered yet');
    return exposed.query;
  };

  const other = () => {
    if (!exposed.other) throw new Error('hook not rendered yet');
    return exposed.other;
  };

  // with a loader the router needs a moment to initialise (and render the hook) before anything can be tested
  const settled = () =>
    waitFor(() => {
      expect(router.state.initialized).toBe(true);
      expect(router.state.navigation.state).toBe('idle');
      expect(exposed.query).toBeDefined();
      expect(exposed.other).toBeDefined();
    });

  return { router, query, other, settled, rerender: () => exposed.rerender?.() };
};

describe('useQueryParams with a data router (async navigation)', () => {
  // the pending-navigation store is shared by the whole module: start every test from a clean one
  afterEach(() => {
    resetPendingSearch();
  });

  it('two updates in the same tick compose', async () => {
    const { router, query, settled } = setup('/products?sortBy=name');
    await settled();

    act(() => {
      query().removeParams(['search']);
      query().setParams({ status: 'draft' });
    });
    await settled();

    expect(router.state.location.search).toBe('?sortBy=name&status=draft');
  });

  it('an update made after an unrelated re-render, before the first navigation committed, still builds on it', async () => {
    // e.g. the user picks a status, a re-render happens (a dropdown closing, a query refetching...),
    // then a debounced search update fires - all before the router has committed the status.
    const { router, query, rerender, settled } = setup('/products?sortBy=name');
    await settled();

    act(() => {
      query().setParams({ status: 'active' });
    });
    act(() => {
      rerender();
    });
    act(() => {
      query().setParams({ search: 'abc' });
    });
    await settled();

    expect(router.state.location.search).toBe('?sortBy=name&status=active&search=abc');
  });

  it('several re-renders in between do not lose the pending update either', async () => {
    const { router, query, rerender, settled } = setup('/products');
    await settled();

    act(() => {
      query().setParams({ a: '1' });
    });
    act(() => {
      rerender();
    });
    act(() => {
      rerender();
    });
    act(() => {
      query().setParams({ b: '2' });
    });
    act(() => {
      rerender();
    });
    act(() => {
      query().setParams({ c: '3' });
    });
    await settled();

    expect(router.state.location.search).toBe('?a=1&b=2&c=3');
  });

  describe('two components that each use the hook', () => {
    it('an update from one builds on an update the other just made (before the router committed it)', async () => {
      // e.g. the status select (in the page) and the debounced search box (in a child) of the products page
      const { router, query, other, settled } = setup('/products?sortBy=name');
      await settled();

      act(() => {
        query().setParams({ status: 'active' });
      });
      act(() => {
        other().setParams({ search: 'abc' });
      });
      await settled();

      expect(router.state.location.search).toBe('?sortBy=name&status=active&search=abc');
    });

    it('works the other way round too, with a re-render in between', async () => {
      const { router, query, other, rerender, settled } = setup('/products?sortBy=name');
      await settled();

      act(() => {
        other().setParams({ search: 'abc' });
      });
      act(() => {
        rerender();
      });
      act(() => {
        query().setParams({ status: 'active' });
      });
      await settled();

      expect(router.state.location.search).toBe('?sortBy=name&search=abc&status=active');
    });

    it('removing in one component and setting in the other in the same tick compose', async () => {
      const { router, query, other, settled } = setup('/products?search=lipstick&sortBy=name');
      await settled();

      act(() => {
        query().removeParams(['search']);
        other().setParams({ status: 'draft' });
      });
      await settled();

      expect(router.state.location.search).toBe('?sortBy=name&status=draft');
    });

    it('both components see the final URL once it is committed', async () => {
      const { router, query, other, settled } = setup('/products');
      await settled();

      act(() => {
        query().setParams({ a: '1' });
        other().setParams({ b: '2' });
      });
      await settled();

      await waitFor(() => {
        expect(query().queryParams).toEqual({ a: '1', b: '2' });
        expect(other().queryParams).toEqual({ a: '1', b: '2' });
      });
      expect(router.state.location.search).toBe('?a=1&b=2');
    });
  });

  it('follows the real URL again once a navigation commits (Back)', async () => {
    const { router, query, settled } = setup('/products?a=1');
    await settled();

    act(() => {
      query().setParams({ b: '2' });
    });
    await settled();
    expect(router.state.location.search).toBe('?a=1&b=2');

    await act(async () => {
      await router.navigate(-1);
    });
    await settled();
    expect(router.state.location.search).toBe('?a=1');

    act(() => {
      query().setParams({ c: '3' });
    });
    await settled();

    expect(router.state.location.search).toBe('?a=1&c=3');
  });
});
