import type {
  AUTH_PROVIDER_MAP,
  AUTH_PROVIDERS,
  USER_ROLE_MAP,
  USER_ROLES,
  USER_STATUS_MAP,
  USER_STATUSES,
} from '@beautinique/shared-constants';

export type TAuthProvider = (typeof AUTH_PROVIDERS)[number];
export type TAuthProviderMap = typeof AUTH_PROVIDER_MAP;

export type TUserRole = (typeof USER_ROLES)[number];
export type TUserRoleMap = typeof USER_ROLE_MAP;

export type TUserStatus = (typeof USER_STATUSES)[number];
export type TUserStatusMap = typeof USER_STATUS_MAP;
