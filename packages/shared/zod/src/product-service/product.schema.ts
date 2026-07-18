import {
  REGEX,
  TRY_ON_CATEGORY_MAP,
  TRY_ON_MAP,
  VARIANT_TYPES,
  VARIANT_TYPES_MAP,
} from '@beautinique/shared-constants';
import { isNullOrUndefined } from '@beautinique/shared-utils';
import { discriminatedUnion, enum as enum_z, literal, number, object, string } from 'zod';

import { appendCustomIssue } from '../utils/index.js';

export const pricesSchema = object({
  originalPrice: number('Original price is required.')
    .nonnegative('Original price cannot be negative.')
    .positive('Original price must be greater than 0.'),

  sellingPrice: number('Selling price is required.')
    .nonnegative('Selling price cannot be negative.')
    .positive('Selling price must be greater than 0.'),
}).superRefine((data, ctx) => {
  if (data.sellingPrice > data.originalPrice) {
    appendCustomIssue(ctx, 'Selling price cannot be greater than original price.', 'sellingPrice');
  }
});

export const stocksSchema = object({
  stock: number('Stock is required')
    .int('Stock must be a whole number.')
    .nonnegative('Stock cannot be negative.')
    .positive('Stock must be greater than 0.')
    .min(1, 'Stock must be greater than 0.')
    .max(100, 'Stock cannot exceed 100.'),

  stockThreshold: number('Stock threshold is required')
    .int('Stock threshold must be a whole number.')
    .nonnegative('Stock threshold cannot be negative.')
    .positive('Stock threshold must be greater than 0.')
    .min(1, 'Stock threshold must be greater than 0.')
    .max(10, 'Stock threshold cannot exceed 10.'),
}).superRefine((data, ctx) => {
  if (data.stockThreshold >= data.stock) {
    appendCustomIssue(ctx, 'Stock threshold must be less than stock.', 'stockThreshold');
  }
});

const labelAndValueAndTypeSchema = object({
  type: enum_z(VARIANT_TYPES, 'Variant type is required.'),

  label: string('Variant label is required.')
    .nonempty('Variant label is required.')
    .min(2, 'Variant label must be at least 2 characters.')
    .max(100, 'Variant label cannot exceed 100 characters.')
    .regex(REGEX.SINGLE_SPACE, 'Variant label cannot contain consecutive spaces.'),

  value: string('Variant value is required.')
    .nonempty('Variant value is required.')
    .regex(REGEX.SINGLE_SPACE, 'Variant value cannot contain consecutive spaces.'),
}).superRefine((data, ctx) => {
  const value = data.value.trim();

  /* -------------------------------------------------------------------------- */
  /*                               COLOR VARIANT                                */
  /* -------------------------------------------------------------------------- */

  if (data.type === VARIANT_TYPES_MAP.Color && value && !REGEX.HEX_CODE.test(value)) {
    appendCustomIssue(ctx, 'Invalid hex color code.', 'value');
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                                TEXT VARIANT                                */
  /* -------------------------------------------------------------------------- */

  if (data.type === VARIANT_TYPES_MAP.Text && value) {
    if (value.length > 50) {
      appendCustomIssue(ctx, 'Variant value cannot exceed 50 characters.', 'value');
      return;
    }
    if (value.length < 2) {
      appendCustomIssue(ctx, 'Variant value must be at least 2 character.', 'value');
      return;
    }
  }
});

export const productBasicInfoSchema = pricesSchema.and(
  object({
    title: string('Title is required.')
      .nonempty('Title is required.')
      .min(2, 'Title must be at least 2 characters.')
      .max(150, 'Title cannot exceed 150 characters.')
      .regex(REGEX.SINGLE_SPACE, 'Title cannot contain consecutive spaces.'),

    brand: string('Brand is required.')
      .nonempty('Brand is required.')
      .min(2, 'Brand must be at least 2 characters.')
      .max(80, 'Brand cannot exceed 80 characters.')
      .regex(REGEX.SINGLE_SPACE, 'Brand cannot contain consecutive spaces.'),

    l1Category: object(
      {
        _id: string('(L1) Main category is required.')
          .nonempty('(L1) Main category is required.')
          .regex(REGEX.MONGODB_ID, '(L1) Main category must be a valid ID.'),
        name: string('(L1) Main category is required.')
          .nonempty('(L1) Main category is required.')
          .regex(REGEX.SINGLE_SPACE, '(L1) Main category cannot contain consecutive spaces.'),
      },
      '(L1) Main category is required.',
    ),

    l2Category: object(
      {
        _id: string('(L2) Sub-category is required.')
          .nonempty('(L2) Sub-category is required.')
          .regex(REGEX.MONGODB_ID, '(L2) Sub-category must be a valid ID.'),
        name: string('(L2) Sub-category is required.')
          .nonempty('(L2) Sub-category is required.')
          .regex(REGEX.SINGLE_SPACE, '(L2) Sub-category cannot contain consecutive spaces.'),
      },
      '(L2) Sub-category is required.',
    ),

    l3Category: object(
      {
        _id: string('(L3) Product category is required.')
          .nonempty('(L3) Product category is required.')
          .regex(REGEX.MONGODB_ID, '(L3) Product category must be a valid ID.'),
        name: string('(L3) Product category is required.')
          .nonempty('(L3) Product category is required.')
          .regex(REGEX.SINGLE_SPACE, '(L3) Product category cannot contain consecutive spaces.'),
      },
      '(L3) Product category is required.',
    ),
  }),
);

const satisfyContentCondition = (value: string | undefined) => {
  if (isNullOrUndefined(value)) return true;
  const trimmed = value.trim();
  return trimmed === '' || trimmed === '<p><br></p>' || trimmed.length >= 20;
};

export const productDescriptionAndContentSchema = object({
  shortDescription: string('Short description is required.')
    .trim()
    .nonempty('Short description is required.')
    .min(10, 'Short description must be at least 10 characters.')
    .max(300, 'Short description cannot exceed 300 characters.')
    .regex(REGEX.SINGLE_SPACE, 'Short description cannot contain consecutive spaces.'),

  description: string('Description is required.')
    .trim()
    .nonempty('Description is required.')
    .refine((value) => value !== '<p><br></p>', 'Description is required.')
    .min(107, 'Description must be at least 100 characters.')
    .regex(REGEX.SINGLE_SPACE, 'Description cannot contain consecutive spaces.')
    .transform((value) => (value === '<p><br></p>' ? '' : value)),

  instructions: string()
    .trim()
    .optional()
    .refine(
      (value) => satisfyContentCondition(value),
      'Usage instructions must be at least 10 characters.',
    )
    .transform((value) => (value === '<p><br></p>' ? undefined : value)),

  ingredients: string()
    .trim()
    .optional()
    .refine(
      (value) => satisfyContentCondition(value),
      'Ingredients must be at least 10 characters.',
    )
    .transform((value) => (value === '<p><br></p>' ? undefined : value)),

  additional: string()
    .trim()
    .optional()
    .refine(
      (value) => satisfyContentCondition(value),
      'Additional details must be at least 10 characters.',
    )
    .transform((value) => (value === '<p><br></p>' ? undefined : value)),
});

export const baseVariantZodSchema = labelAndValueAndTypeSchema.and(pricesSchema).and(stocksSchema);

export const withoutVariantsSchema = stocksSchema.extend({ hasVariants: literal(false) });

const tryonConfiguration = discriminatedUnion(
  'category',
  [
    object({
      category: literal(TRY_ON_CATEGORY_MAP.LIP),
      subCategory: enum_z(TRY_ON_MAP[TRY_ON_CATEGORY_MAP.LIP], `TryOn sub-category is required.`),
    }),

    object({
      category: literal(TRY_ON_CATEGORY_MAP.EYE),
      subCategory: enum_z(TRY_ON_MAP[TRY_ON_CATEGORY_MAP.EYE], `TryOn sub-category is required.`),
    }),

    object({
      category: literal(TRY_ON_CATEGORY_MAP.HAIR),
      subCategory: enum_z(TRY_ON_MAP[TRY_ON_CATEGORY_MAP.HAIR], `TryOn sub-category is required.`),
    }),

    object({
      category: literal(TRY_ON_CATEGORY_MAP.FACE),
      subCategory: enum_z(TRY_ON_MAP[TRY_ON_CATEGORY_MAP.FACE], `TryOn sub-category is required.`),
    }),

    object({
      category: literal(TRY_ON_CATEGORY_MAP.NAIL),
      subCategory: enum_z(TRY_ON_MAP[TRY_ON_CATEGORY_MAP.NAIL], `TryOn sub-category is required.`),
    }),

    object({
      category: literal(TRY_ON_CATEGORY_MAP.SKIN),
      subCategory: enum_z(TRY_ON_MAP[TRY_ON_CATEGORY_MAP.SKIN], `TryOn sub-category is required.`),
    }),
  ],
  'TryOn category is required.',
);

export const productTryOnConfigurationSchema = discriminatedUnion(
  'enabled',
  [
    object({ enabled: literal(false), tryOn: tryonConfiguration.optional() }),
    object({ enabled: literal(true), tryOn: tryonConfiguration }),
  ],
  'TryOn is required.',
);
