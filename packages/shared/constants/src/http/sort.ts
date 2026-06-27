export const SORT = ['ASC', 'DESC'] as const;

export const SORT_MAP = Object.fromEntries(
  SORT.map((sort) => [sort, sort.toLowerCase()] as const),
) as { [K in (typeof SORT)[number]]: Lowercase<K> };
