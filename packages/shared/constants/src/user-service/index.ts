// `SUPER_ADMIN` sits between `ADMIN` and `MASTER` - it's the global backup
// safety-net role for state-territory assignment (see `ADMIN_STATUSES` /
// `TERRITORY_ASSIGNMENT_REASONS` below), not a replacement for `MASTER`
// (which stays the top-level, full-override role).
export const USER_ROLES = ['USER', 'SELLER', 'ADMIN', 'SUPER_ADMIN', 'MASTER'] as const;

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

/* ================== ADMIN TERRITORY (state-wise assignment) ================== */

// `Admin.status` - `ACTIVE`/`ON_LEAVE` admins are eligible for
// state-territory resolution, `SUSPENDED` triggers immediate bulk
// reassignment of everything they own, `INACTIVE` is a soft-removed admin
// profile (role demoted away from `ADMIN`/`SUPER_ADMIN`/`MASTER`).
export const ADMIN_STATUSES = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE'] as const;

export const ADMIN_STATUS_MAP = Object.fromEntries(
  ADMIN_STATUSES.map((status) => [status, status] as const),
) as { readonly [K in (typeof ADMIN_STATUSES)[number]]: K };

// `Seller.assignedAdminHistory[].reason` - why a seller (and, by extension,
// their products) landed with a particular admin.
export const TERRITORY_ASSIGNMENT_REASONS = [
  'STATE_MATCH', // primary admin for the seller's state, resolved normally
  'BACKUP_COVERAGE', // primary was ON_LEAVE, routed to their configured backup
  'SUPER_ADMIN_POOL', // no eligible state/backup admin, fell to the SUPER_ADMIN pool
  'MANUAL_REASSIGN', // MASTER/SUPER_ADMIN moved it by hand
  'ADMIN_SUSPENDED', // previous admin got SUSPENDED, bulk-reassigned away from them
  'SLA_TIMEOUT', // sat PENDING too long under an ON_LEAVE admin, auto-escalated away
] as const;

export const TERRITORY_ASSIGNMENT_REASON_MAP = Object.fromEntries(
  TERRITORY_ASSIGNMENT_REASONS.map((reason) => [reason, reason] as const),
) as { readonly [K in (typeof TERRITORY_ASSIGNMENT_REASONS)[number]]: K };

// Why an `Admin.status` changed - drives the `territory-status-changed`
// job (see `@beautinique/backend-bullmq`) and `Admin.leaveHistory` entries.
export const TERRITORY_STATUS_CHANGE_REASONS = ['LEAVE', 'SUSPENDED', 'REACTIVATED'] as const;

export const TERRITORY_STATUS_CHANGE_REASON_MAP = Object.fromEntries(
  TERRITORY_STATUS_CHANGE_REASONS.map((reason) => [reason, reason] as const),
) as { readonly [K in (typeof TERRITORY_STATUS_CHANGE_REASONS)[number]]: K };
