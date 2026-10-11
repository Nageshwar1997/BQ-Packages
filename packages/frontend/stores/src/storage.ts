/** The part of `Storage` the stores use: `localStorage` and `sessionStorage` both fit. */
export interface IStoreStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/**
 * `localStorage`, or nothing where there is none (on a server) or where the browser does not let
 * the page use it (reading it throws when storage is blocked).
 */
export const getDefaultStorage = (): IStoreStorage | undefined => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

/** What is stored under `key`, or `null` when nothing is or when the storage cannot be read. */
export const readStored = (storage: IStoreStorage | undefined, key: string) => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

/** Stores `value`. A storage that is full or blocked is ignored: the app works, it just forgets. */
export const writeStored = (storage: IStoreStorage | undefined, key: string, value: string) => {
  try {
    storage?.setItem(key, value);
  } catch {
    // ignored on purpose, see above
  }
};

/** Removes what is stored under `key`; a storage that is blocked is ignored. */
export const removeStored = (storage: IStoreStorage | undefined, key: string) => {
  try {
    storage?.removeItem(key);
  } catch {
    // ignored on purpose, see `writeStored`
  }
};
