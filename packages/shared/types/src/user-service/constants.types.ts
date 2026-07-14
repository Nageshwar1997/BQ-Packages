import type {
  AUTH_PROVIDER_MAP,
  AUTH_PROVIDERS,
  SELLER_TYPE_MAP,
  SELLER_TYPES,
  USER_ROLE_MAP,
  USER_ROLES,
} from '@beautinique/shared-constants';

export type TAuthProvider = (typeof AUTH_PROVIDERS)[number];
export type TAuthProviderMap = typeof AUTH_PROVIDER_MAP;

export type TSeller = (typeof SELLER_TYPES)[number];
export type TSellerTypeMap = typeof SELLER_TYPE_MAP;

export type TUserRole = (typeof USER_ROLES)[number];
export type TUserRoleMap = typeof USER_ROLE_MAP;
