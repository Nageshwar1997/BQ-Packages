export const PRODUCT_STATUSES = ['DELETED', 'PENDING', 'PUBLISHED', 'REJECTED', 'BLOCKED'] as const;

export const PRODUCT_STATUSES_MAP = Object.fromEntries(
  PRODUCT_STATUSES.map((status) => [status, status] as const),
) as { readonly [K in (typeof PRODUCT_STATUSES)[number]]: K };
