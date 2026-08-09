export const DRAFT_PRODUCT_STEP_MAP = {
  0: 'basicInfo',
  1: 'mediaAndGallery',
  2: 'descriptionAndContent',
  3: 'stockAndVariants',
  4: 'tryOnConfiguration',
  5: 'review',
} as const;

export const DRAFT_PRODUCT_STEPPER_STEPS = Object.keys(DRAFT_PRODUCT_STEP_MAP).map(
  Number,
) as readonly (keyof typeof DRAFT_PRODUCT_STEP_MAP)[];

export const DRAFT_PRODUCT_STEPPER_STEPS_MAP = Object.fromEntries(
  DRAFT_PRODUCT_STEPPER_STEPS.map((type) => [type, type]),
) as { readonly [K in keyof typeof DRAFT_PRODUCT_STEP_MAP]: K };
