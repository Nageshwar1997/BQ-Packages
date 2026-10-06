import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { usePathParams } from './usePathParams.js';

const createWrapper = (entry: string | { pathname: string; search?: string; hash?: string }) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/products/:productId/reviews/:reviewId" element={children} />
        <Route path="/products/:productId" element={children} />
        <Route path="*" element={children} />
      </Routes>
    </MemoryRouter>
  );

  return Wrapper;
};

describe('usePathParams', () => {
  it('splits the pathname into its non-empty segments', () => {
    const { result } = renderHook(() => usePathParams(), {
      wrapper: createWrapper('/seller/products//list/'),
    });

    expect(result.current.paths).toEqual(['seller', 'products', 'list']);
  });

  it('returns no segments for the root path', () => {
    const { result } = renderHook(() => usePathParams(), { wrapper: createWrapper('/') });

    expect(result.current.paths).toEqual([]);
  });

  it('exposes the dynamic route params as pathParams', () => {
    const { result } = renderHook(() => usePathParams(), {
      wrapper: createWrapper('/products/42/reviews/7'),
    });

    expect(result.current.pathParams).toEqual({ productId: '42', reviewId: '7' });
  });

  it('exposes the location, both nested and spread flat', () => {
    const { result } = renderHook(() => usePathParams(), {
      wrapper: createWrapper({ pathname: '/products/42', search: '?tab=info', hash: '#top' }),
    });

    expect(result.current.location.pathname).toBe('/products/42');
    expect(result.current.pathname).toBe('/products/42');
    expect(result.current.search).toBe('?tab=info');
    expect(result.current.hash).toBe('#top');
    expect(result.current.location.search).toBe(result.current.search);
  });

  it('navigate() moves to the new path and the hook values follow', () => {
    const { result } = renderHook(() => usePathParams(), { wrapper: createWrapper('/products/1') });
    expect(result.current.pathParams).toEqual({ productId: '1' });

    act(() => {
      void result.current.navigate('/products/2');
    });

    expect(result.current.pathname).toBe('/products/2');
    expect(result.current.paths).toEqual(['products', '2']);
    expect(result.current.pathParams).toEqual({ productId: '2' });
  });
});
