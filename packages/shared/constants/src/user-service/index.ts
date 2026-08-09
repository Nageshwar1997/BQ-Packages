export const USER_ROLES = ['USER', 'SELLER', 'ADMIN', 'MASTER'] as const;

export const USER_ROLE_MAP = Object.fromEntries(
  USER_ROLES.map((role) => [role, role] as const),
) as { [K in (typeof USER_ROLES)[number]]: K };

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'DELETED'] as const;

export const USER_STATUS_MAP = Object.fromEntries(
  USER_STATUSES.map((role) => [role, role] as const),
) as { [K in (typeof USER_STATUSES)[number]]: K };

export const AUTH_PROVIDERS = ['MANUAL', 'GOOGLE', 'LINKEDIN', 'GITHUB'] as const;

export const AUTH_PROVIDER_MAP = Object.fromEntries(
  AUTH_PROVIDERS.map((provider) => [provider, provider] as const),
) as { [K in (typeof AUTH_PROVIDERS)[number]]: K };
