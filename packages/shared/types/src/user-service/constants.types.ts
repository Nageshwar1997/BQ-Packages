import type {
  ADMIN_STATUS_MAP,
  ADMIN_STATUSES,
  AUTH_PROVIDER_MAP,
  AUTH_PROVIDERS,
  TERRITORY_ASSIGNMENT_REASON_MAP,
  TERRITORY_ASSIGNMENT_REASONS,
  TERRITORY_STATUS_CHANGE_REASON_MAP,
  TERRITORY_STATUS_CHANGE_REASONS,
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

export type TAdminStatus = (typeof ADMIN_STATUSES)[number];
export type TAdminStatusMap = typeof ADMIN_STATUS_MAP;

export type TTerritoryAssignmentReason = (typeof TERRITORY_ASSIGNMENT_REASONS)[number];
export type TTerritoryAssignmentReasonMap = typeof TERRITORY_ASSIGNMENT_REASON_MAP;

export type TTerritoryStatusChangeReason = (typeof TERRITORY_STATUS_CHANGE_REASONS)[number];
export type TTerritoryStatusChangeReasonMap = typeof TERRITORY_STATUS_CHANGE_REASON_MAP;
