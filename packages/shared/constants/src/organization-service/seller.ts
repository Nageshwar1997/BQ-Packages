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

export const SELLER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const SELLER_APPROVAL_STATUS_MAP = Object.fromEntries(
  SELLER_APPROVAL_STATUS.map((status) => [status, status]),
) as { readonly [K in (typeof SELLER_APPROVAL_STATUS)[number]]: K };

export const SELLER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

export const SELLER_STATUS_MAP = Object.fromEntries(
  SELLER_STATUSES.map((status) => [status, status]),
) as { readonly [K in (typeof SELLER_STATUSES)[number]]: K };

export const DRAFT_SELLER_STEP_MAP = {
  0: 'businessDetails',
  1: 'bankDetails',
  2: 'address',
  3: 'documents',
  4: 'review',
} as const;

export const SELLER_STEPPER_STEPS = Object.keys(DRAFT_SELLER_STEP_MAP).map(
  Number,
) as readonly (keyof typeof DRAFT_SELLER_STEP_MAP)[];

export const SELLER_STEPPER_STEPS_MAP = Object.fromEntries(
  SELLER_STEPPER_STEPS.map((type) => [type, type]),
) as { readonly [K in keyof typeof DRAFT_SELLER_STEP_MAP]: K };
