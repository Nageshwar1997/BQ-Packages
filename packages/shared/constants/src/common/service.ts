export const MICROSERVICE_NAMES = [
  'user-service',
  'product-service',
  'media-service',
  'mail-service',
] as const;

export const MICROSERVICE_NAME_MAP = Object.fromEntries(
  MICROSERVICE_NAMES.map((service) => [service, service] as const),
) as { readonly [K in (typeof MICROSERVICE_NAMES)[number]]: K };
