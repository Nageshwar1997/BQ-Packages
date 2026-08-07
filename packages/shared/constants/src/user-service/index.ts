export const USER_ROLES = ['USER', 'SELLER', 'ADMIN', 'MASTER'] as const;

export const USER_ROLE_MAP = Object.fromEntries(
  USER_ROLES.map((role) => [role, role] as const),
) as { [K in (typeof USER_ROLES)[number]]: K };

export const SELLER_TYPES = [
  'Individual',
  'Sole Proprietorship',
  'Partnership',
  'Private Limited Company',
  'Public Limited Company',
  'LLP',
  'Freelance Seller',
  'Small Business',
  'Home-based Seller',
  'Retail Store',
  'Salon',
  'Wholesale Distributor',
  'Spa',
  'Clinic',
  'Brand',
] as const;

export const SELLER_TYPE_MAP = Object.fromEntries(
  SELLER_TYPES.map((seller) => [seller, seller] as const),
) as { readonly [K in (typeof SELLER_TYPES)[number]]: K };

export const AUTH_PROVIDERS = ['MANUAL', 'GOOGLE', 'LINKEDIN', 'GITHUB'] as const;

export const AUTH_PROVIDER_MAP = Object.fromEntries(
  AUTH_PROVIDERS.map((provider) => [provider, provider] as const),
) as { [K in (typeof AUTH_PROVIDERS)[number]]: K };
