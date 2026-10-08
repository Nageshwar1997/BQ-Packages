import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  IOnlineStatus,
  IOnlineStatusStore,
  IOnlineStatusStoreOptions,
  IOutsideClickOptions,
  IQueryParamsUpdateOptions,
  IUseDebounce,
  IUseIsSmallScreenOptions,
  IUseQueryParamInputOptions,
  TOnlineStatus,
  TStringRecord,
} from './index.js';
import * as hooks from './index.js';

// What the package gives to the apps. Nothing else may be reachable from the index: an internal
// helper that leaks becomes a promise to keep it.
describe('the public API of the package', () => {
  it('exports exactly these values', () => {
    expect(Object.keys(hooks).sort()).toEqual([
      'createOnlineStatusStore',
      'onlineStatusStore',
      'useDebounce',
      'useIsSmallScreen',
      'useOnlineStatus',
      'useOutsideClick',
      'usePathParams',
      'useQueryParamInput',
      'useQueryParams',
    ]);
  });

  it('keeps the internal engine of useQueryParamInput out', () => {
    expect(hooks).not.toHaveProperty('useQueryParamsEngine');
  });

  it('exports these types', () => {
    expectTypeOf<IOnlineStatus['status']>().toEqualTypeOf<TOnlineStatus>();
    expectTypeOf<IOnlineStatusStoreOptions>().toBeObject();
    expectTypeOf<IOnlineStatusStore['recheck']>().toBeFunction();
    expectTypeOf<IOutsideClickOptions>().toBeObject();
    expectTypeOf<IQueryParamsUpdateOptions>().toBeObject();
    expectTypeOf<IUseDebounce<[string]>>().toBeObject();
    expectTypeOf<IUseIsSmallScreenOptions>().toBeObject();
    expectTypeOf<IUseQueryParamInputOptions>().toBeObject();
    expectTypeOf<TStringRecord>().toBeObject();
  });
});

// If this type were exported from the index, the next line would have no error: the comment would be
// reported as unused and the type check of the package would fail.
// @ts-expect-error `IUpdateResult` is internal, it must not be exported
export type TLeakedInternal = import('./index.js').IUpdateResult; // eslint-disable-line @typescript-eslint/consistent-type-imports
