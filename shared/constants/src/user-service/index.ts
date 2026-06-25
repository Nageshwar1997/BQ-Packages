export const ROLES = ['USER', 'SELLER', 'ADMIN', 'MASTER'] as const;
export type TRole = (typeof ROLES)[number];

export const ROLES_MAP = Object.fromEntries(ROLES.map((role) => [role, role] as const)) as {
  readonly [K in TRole]: K;
};
export type TRolesMap = typeof ROLES_MAP;

export const SELLER_TYPES = [
  'Individual',
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
export type TSeller = (typeof SELLER_TYPES)[number];

export const SELLER_TYPES_MAP = Object.fromEntries(
  SELLER_TYPES.map((seller) => [seller, seller] as const),
) as { readonly [K in TSeller]: K };
export type TSellerTypesMap = typeof SELLER_TYPES_MAP;

export const AUTH_PROVIDERS = ['MANUAL', 'GOOGLE', 'LINKEDIN', 'GITHUB'] as const;
export type TAuthProvider = (typeof AUTH_PROVIDERS)[number];

export const AUTH_PROVIDERS_MAP = Object.fromEntries(
  AUTH_PROVIDERS.map((authProvider) => [authProvider, authProvider] as const),
) as { readonly [K in TAuthProvider]: K };
export type TAuthProvidersMap = typeof AUTH_PROVIDERS_MAP;
