import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useQueryParams } from './useQueryParams.js';

const setup = (entry: string) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
  );

  // The router state is read alongside the hook, so each test can see the resulting URL.
  return renderHook(
    () => ({
      query: useQueryParams(),
      location: useLocation(),
      navigationType: useNavigationType(),
    }),
    { wrapper: Wrapper },
  );
};

describe('useQueryParams', () => {
  describe('queryParams', () => {
    it('reads the query string into an object', () => {
      const { result } = setup('/products?category=lips&page=2');

      expect(result.current.query.queryParams).toEqual({ category: 'lips', page: '2' });
    });

    it('is empty when there is no query string', () => {
      const { result } = setup('/products');

      expect(result.current.query.queryParams).toEqual({});
    });

    it('decodes encoded values', () => {
      const { result } = setup('/products?name=red%20lipstick&tag=a%26b');

      expect(result.current.query.queryParams).toEqual({ name: 'red lipstick', tag: 'a&b' });
    });

    it('keeps the last value of a repeated key', () => {
      const { result } = setup('/products?tag=a&tag=b');

      expect(result.current.query.queryParams).toEqual({ tag: 'b' });
    });
  });

  describe('setParams', () => {
    it('merges the new params into the current ones and keeps the pathname', () => {
      const { result } = setup('/products?category=lips');

      act(() => {
        result.current.query.setParams({ page: '2' });
      });

      expect(result.current.location.pathname).toBe('/products');
      expect(result.current.query.queryParams).toEqual({ category: 'lips', page: '2' });
    });

    it('overwrites an existing key', () => {
      const { result } = setup('/products?page=1');

      act(() => {
        result.current.query.setParams({ page: '3' });
      });

      expect(result.current.query.queryParams).toEqual({ page: '3' });
    });

    it('drops empty-string values from the URL', () => {
      const { result } = setup('/products?category=lips&q=gloss');

      act(() => {
        result.current.query.setParams({ q: '' });
      });

      expect(result.current.location.search).toBe('?category=lips');
    });

    it('drops null and undefined values from the URL', () => {
      const { result } = setup('/products?category=lips');

      act(() => {
        result.current.query.setParams({
          a: null,
          b: undefined,
          c: 'kept',
        } as unknown as Record<string, string>);
      });

      expect(result.current.location.search).toBe('?category=lips&c=kept');
    });

    it('accepts an updater function that replaces the params', () => {
      const { result } = setup('/products?category=lips&page=2');

      act(() => {
        result.current.query.setParams((prev) => ({ page: String(Number(prev.page) + 1) }));
      });

      expect(result.current.query.queryParams).toEqual({ page: '3' });
    });

    it('encodes special characters', () => {
      const { result } = setup('/products');

      act(() => {
        result.current.query.setParams({ name: 'red lipstick', tag: 'a&b' });
      });

      expect(result.current.location.search).toBe('?name=red+lipstick&tag=a%26b');
      expect(result.current.query.queryParams).toEqual({ name: 'red lipstick', tag: 'a&b' });
    });

    it('adds a new history entry (does not replace the current one)', () => {
      const { result } = setup('/products');

      act(() => {
        result.current.query.setParams({ page: '2' });
      });

      expect(result.current.navigationType).toBe('PUSH');
    });
  });

  describe('removeParams', () => {
    it('removes a single key and keeps the others', () => {
      const { result } = setup('/products?category=lips&page=2');

      act(() => {
        result.current.query.removeParams('page');
      });

      expect(result.current.query.queryParams).toEqual({ category: 'lips' });
    });

    it('removes a list of keys', () => {
      const { result } = setup('/products?a=1&b=2&c=3');

      act(() => {
        result.current.query.removeParams(['a', 'c']);
      });

      expect(result.current.query.queryParams).toEqual({ b: '2' });
    });

    it('ignores keys that are not in the URL', () => {
      const { result } = setup('/products?a=1');

      act(() => {
        result.current.query.removeParams(['missing']);
      });

      expect(result.current.query.queryParams).toEqual({ a: '1' });
    });
  });

  describe('clearParams', () => {
    it('removes every param and keeps the pathname', () => {
      const { result } = setup('/products?a=1&b=2');

      act(() => {
        result.current.query.clearParams();
      });

      expect(result.current.location.pathname).toBe('/products');
      expect(result.current.location.search).toBe('');
      expect(result.current.query.queryParams).toEqual({});
    });
  });

  describe('history', () => {
    it('{ replace: true } replaces the current entry for setParams', () => {
      const { result } = setup('/products');

      act(() => {
        result.current.query.setParams({ login: 'true' }, { replace: true });
      });

      expect(result.current.location.search).toBe('?login=true');
      expect(result.current.navigationType).toBe('REPLACE');
    });

    it('{ replace: true } replaces the current entry for removeParams', () => {
      const { result } = setup('/products?login=true&page=2');

      act(() => {
        result.current.query.removeParams(['login'], { replace: true });
      });

      expect(result.current.location.search).toBe('?page=2');
      expect(result.current.navigationType).toBe('REPLACE');
    });

    it('{ replace: true } replaces the current entry for clearParams', () => {
      const { result } = setup('/products?a=1');

      act(() => {
        result.current.query.clearParams({ replace: true });
      });

      expect(result.current.location.search).toBe('');
      expect(result.current.navigationType).toBe('REPLACE');
    });

    it('pushes a new entry when replace is false or left out', () => {
      const { result } = setup('/products?a=1');

      act(() => {
        result.current.query.setParams({ a: '2' }, { replace: false });
      });

      expect(result.current.navigationType).toBe('PUSH');
    });

    it('does not navigate when setParams would leave the query string unchanged', () => {
      const { result } = setup('/products?category=lips&page=2');
      const keyBefore = result.current.location.key;

      act(() => {
        result.current.query.setParams({ page: '2' });
      });

      expect(result.current.location.key).toBe(keyBefore);
      expect(result.current.navigationType).toBe('POP');
    });

    it('does not navigate when removeParams is given a key that is not in the URL', () => {
      const { result } = setup('/products?category=lips');
      const keyBefore = result.current.location.key;

      act(() => {
        result.current.query.removeParams('login');
        result.current.query.removeParams(['login'], { replace: true });
      });

      expect(result.current.location.key).toBe(keyBefore);
      expect(result.current.navigationType).toBe('POP');
    });

    it('does not navigate when clearParams is called with no query string', () => {
      const { result } = setup('/products');
      const keyBefore = result.current.location.key;

      act(() => {
        result.current.query.clearParams();
      });

      expect(result.current.location.key).toBe(keyBefore);
      expect(result.current.navigationType).toBe('POP');
    });

    it('does not navigate when an updater function returns the current params', () => {
      const { result } = setup('/products?a=1&b=2');
      const keyBefore = result.current.location.key;

      act(() => {
        result.current.query.setParams((prev) => prev);
      });

      expect(result.current.location.key).toBe(keyBefore);
    });
  });

  describe('identities', () => {
    it('keeps setParams/removeParams/clearParams identities while the URL does not change', () => {
      const { result, rerender } = setup('/products?a=1');
      const first = result.current.query;

      rerender();

      expect(result.current.query.setParams).toBe(first.setParams);
      expect(result.current.query.removeParams).toBe(first.removeParams);
      expect(result.current.query.clearParams).toBe(first.clearParams);
    });

    it('keeps the same queryParams object while the URL does not change', () => {
      const { result, rerender } = setup('/products?a=1&b=2');
      const first = result.current.query.queryParams;

      rerender();
      rerender();

      expect(result.current.query.queryParams).toBe(first);
    });

    it('gives a new queryParams object when the query string changes', () => {
      const { result } = setup('/products?a=1');
      const first = result.current.query.queryParams;

      act(() => {
        result.current.query.setParams({ a: '2' });
      });

      expect(result.current.query.queryParams).not.toBe(first);
      expect(result.current.query.queryParams).toEqual({ a: '2' });
    });
  });
});
