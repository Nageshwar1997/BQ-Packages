export const SERVICES = [
  'user-service',
  'product-service',
  'media-service',
  'mail-service',
] as const;
export type TService = (typeof SERVICES)[number];

export const SERVICES_MAP = Object.fromEntries(
  SERVICES.map((service) => [service, service] as const),
) as { readonly [K in TService]: K };
export type TServiceMap = typeof SERVICES_MAP;

export const API_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type TApiMethod = (typeof API_METHODS)[number];

export const API_METHODS_MAP = Object.fromEntries(
  API_METHODS.map((method) => [method, method.toLowerCase()] as const),
) as { readonly [K in TApiMethod]: Lowercase<K> };
export type TApiMethodsMap = typeof API_METHODS_MAP;

export const SORT = ['asc', 'desc'] as const;
export type TSort = (typeof SORT)[number];

export const SORT_MAP = Object.fromEntries(SORT.map((sort) => [sort, sort])) as {
  [K in TSort]: K;
};
export type TSortMap = typeof SORT_MAP;
