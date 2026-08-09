export const VARIANT_TYPES = ['Color', 'Text'] as const;

export const VARIANT_TYPES_MAP = Object.fromEntries(
  VARIANT_TYPES.map((type) => [type, type] as const),
) as { readonly [K in (typeof VARIANT_TYPES)[number]]: K };
