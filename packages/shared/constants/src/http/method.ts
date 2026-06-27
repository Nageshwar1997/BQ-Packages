export const API_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const API_METHODS_MAP = Object.fromEntries(
  API_METHODS.map((method) => [method, method.toLowerCase()] as const),
) as { readonly [K in (typeof API_METHODS)[number]]: Lowercase<K> };
