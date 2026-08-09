export const CONTACT_QUERY_TYPES = [
  'Order Related',
  'Returns & Refunds',
  'Payment Issue',
  'Product Question',
  'Become a Seller',
  'Account Help',
  'Feedback / Suggestion',
  'Something Else / Other',
] as const;

export const CONTACT_QUERY_TYPE_MAP = Object.fromEntries(
  CONTACT_QUERY_TYPES.map((type) => [type, type]),
) as {
  readonly [K in (typeof CONTACT_QUERY_TYPES)[number]]: K;
};

export const CONTACT_QUERY_STATUS = ['OPENED', 'ANSWERED', 'CLOSED', 'REJECTED'] as const;

export const CONTACT_QUERY_STATUS_MAP = Object.fromEntries(
  CONTACT_QUERY_STATUS.map((status) => [status, status]),
) as {
  readonly [K in (typeof CONTACT_QUERY_STATUS)[number]]: K;
};
