export const AUTH_PROVIDERS = ['MANUAL', 'GOOGLE', 'LINKEDIN', 'GITHUB'] as const;

export const AUTH_PROVIDERS_MAP = Object.fromEntries(
  AUTH_PROVIDERS.map((provider) => [provider, provider] as const),
) as { [K in (typeof AUTH_PROVIDERS)[number]]: K };

export const SELLER_TYPES_MAP = {
  INDIVIDUAL: 'Individual',
  FREELANCE_SELLER: 'Freelance Seller',
  SMALL_BUSINESS: 'Small Business',
  HOME_BASED_SELLER: 'Home-based Seller',
  RETAIL_STORE: 'Retail Store',
  SALON: 'Salon',
  WHOLESALE_DISTRIBUTOR: 'Wholesale Distributor',
} as const;

export const SELLER_TYPES = Object.values(SELLER_TYPES_MAP);

export const USER_ROLES = ['USER', 'SELLER', 'ADMIN', 'MASTER'] as const;

export const USER_ROLES_MAP = Object.fromEntries(
  USER_ROLES.map((role) => [role, role] as const),
) as { [K in (typeof USER_ROLES)[number]]: K };
