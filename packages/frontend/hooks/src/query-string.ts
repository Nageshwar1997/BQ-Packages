import { isNullOrUndefined } from '@beautinique/shared-utils';

export type TStringRecord = Record<string, string>;

export type TParamsUpdate = TStringRecord | ((prevParams: TStringRecord) => TStringRecord);

/** `''`, `null` and `undefined` mean "no value": such a param is left out of the URL. */
const isBlank = (value: unknown): boolean => isNullOrUndefined(value) || value === '';

/** Reads a query string (with or without the leading `?`) into an object; a repeated key keeps its last value. */
export const parseParams = (search: string): TStringRecord => {
  const params: TStringRecord = {};

  for (const [key, value] of new URLSearchParams(search).entries()) {
    params[key] = value;
  }

  return params;
};

/** The query string, normalised the way `buildSearch` writes it (no leading `?`). */
export const normalizeSearch = (search: string): string => new URLSearchParams(search).toString();

/**
 * Works out the next query string (no leading `?`) after applying `update` to `currentSearch`.
 *
 * - Blank values (`''`, `null`, `undefined`) are left out.
 * - A param the update does not touch keeps **all** its values (`?tag=a&tag=b` stays as is), and
 *   its position in the URL. For an object update, "touch" means the key is in the object; for an
 *   updater function it means the returned value differs from the one the function was given.
 * - A param that is set gets exactly one value.
 */
export const buildSearch = (currentSearch: string, update: TParamsUpdate): string => {
  const original = new URLSearchParams(currentSearch);
  const current = parseParams(currentSearch);

  // `explicit` is the object the caller passed (null for an updater function).
  let explicit: TStringRecord | null = null;
  let wanted: TStringRecord;

  if (typeof update === 'function') {
    wanted = update(current);
  } else {
    explicit = update;
    wanted = { ...current, ...update };
  }

  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(wanted)) {
    if (isBlank(value)) continue;

    const untouched = explicit ? !Object.hasOwn(explicit, key) : value === current[key];

    if (untouched) {
      for (const originalValue of original.getAll(key)) {
        if (originalValue !== '') next.append(key, originalValue);
      }
    } else {
      next.set(key, value);
    }
  }

  return next.toString();
};
