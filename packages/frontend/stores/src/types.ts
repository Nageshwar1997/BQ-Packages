import type { StoreApi, UseBoundStore } from 'zustand';

/** What a `create...Store` function gives back: the hook, with `getState`, `setState`, `subscribe`. */
export type TStoreHook<TState> = UseBoundStore<StoreApi<TState>>;
