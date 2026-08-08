export const SERVICE_NAMES = [
  'user-service',
  'product-service',
  'media-service',
  'mail-service',
  'organization-service',
] as const;

export const SERVICE_NAMES_MAP = Object.fromEntries(
  SERVICE_NAMES.map((service) => [service, service] as const),
) as { readonly [K in (typeof SERVICE_NAMES)[number]]: K };

export const API_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const API_METHODS_MAP = Object.fromEntries(
  API_METHODS.map((method) => [method, method.toLowerCase()]),
) as { readonly [K in (typeof API_METHODS)[number]]: Lowercase<K> };

export const SORT = ['asc', 'desc'] as const;

export const SORT_MAP = Object.fromEntries(SORT.map((sort) => [sort, sort])) as {
  readonly [K in (typeof SORT)[number]]: K;
};

export const HEADERS_MAP = {
  serviceSecret: 'X-Service-Secret',
  userId: 'X-User-Id',
  userRole: 'X-User-Role',
  authorization: 'Authorization',
  contentType: 'Content-Type',
  loginRole: 'X-Login-Role',
} as const;

export const HEADERS = Object.values(HEADERS_MAP);

export const MAX_OTP_RESEND = 3 as const;

export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;