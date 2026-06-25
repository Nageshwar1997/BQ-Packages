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
