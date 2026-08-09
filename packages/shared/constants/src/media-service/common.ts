export const KB = 1024 as const; // 1KB
export const MB = KB ** 2; // 1MB
export const GB = KB ** 3; // 1GB

export const MEDIA_STATUSES = ['DRAFT', 'UNUSED', 'USED', 'DELETED'] as const;

export const MEDIA_STATUS_MAP = Object.fromEntries(
  MEDIA_STATUSES.map((status) => [status, status] as const),
) as { readonly [K in (typeof MEDIA_STATUSES)[number]]: K };

export const MEDIA_RESOURCES = ['image', 'video'] as const;

export const MEDIA_RESOURCE_MAP = Object.fromEntries(
  MEDIA_RESOURCES.map((resource) => [resource.toUpperCase(), resource] as const),
) as {
  readonly [K in (typeof MEDIA_RESOURCES)[number] as Uppercase<K>]: K;
};
