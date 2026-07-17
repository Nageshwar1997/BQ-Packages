import { CATEGORY_LEVELS_MAP, REGEX } from '@beautinique/shared-constants';
import { literal, object, string, union } from 'zod';

/* -------------------------------------------------------------------------- */
/*                               COMMON SCHEMA                                */
/* -------------------------------------------------------------------------- */

const baseCategoryZodSchema = object({
  name: string('Category name is required')
    .trim()
    .nonempty('Category name is required')
    .min(2, 'Category name must be at least 2 characters long')
    .max(120, 'Category name must be at most 120 characters long')
    .regex(REGEX.SINGLE_SPACE, "Category name can't contain consecutive spaces"),
  description: string('Description is required')
    .trim()
    .nonempty('Description is required')
    .min(10, 'Description must be at least 10 characters long')
    .max(300, 'Description must be at most 300 characters long')
    .regex(REGEX.SINGLE_SPACE, "Description can't contain consecutive spaces"),

  // Only for Backend
  parent: string('Parent category is required')
    .trim()
    .nonempty('Parent category is required')
    .length(24, 'Parent category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9')
    .regex(REGEX.NO_SPACE, 'Parent category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9')
    .regex(REGEX.MONGODB_ID, 'Parent category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9'),
});

/* -------------------------------------------------------------------------- */
/*                               LEVEL 1 SCHEMA                               */
/* -------------------------------------------------------------------------- */

export const l1CategoryZodSchema = object({
  level: literal(CATEGORY_LEVELS_MAP.L1, {
    message: `Category level must be ${String(CATEGORY_LEVELS_MAP.L1)}.`,
  }),
  name: baseCategoryZodSchema.shape.name,
});

/* -------------------------------------------------------------------------- */
/*                               LEVEL 2 SCHEMA                               */
/* -------------------------------------------------------------------------- */

export const l2CategoryZodSchema = object({
  level: literal(CATEGORY_LEVELS_MAP.L2, {
    message: `Category level must be ${String(CATEGORY_LEVELS_MAP.L2)}.`,
  }),
  name: baseCategoryZodSchema.shape.name,
  parent: baseCategoryZodSchema.shape.parent,
});

/* -------------------------------------------------------------------------- */
/*                               LEVEL 3 SCHEMA                               */
/* -------------------------------------------------------------------------- */

export const l3CategoryZodSchema = object({
  level: literal(CATEGORY_LEVELS_MAP.L3, {
    message: `Category level must be ${String(CATEGORY_LEVELS_MAP.L3)}.`,
  }),
  name: baseCategoryZodSchema.shape.name,
  parent: baseCategoryZodSchema.shape.parent,
  description: baseCategoryZodSchema.shape.description,
});

/* -------------------------------------------------------------------------- */
/*                              COMBINED SCHEMA                               */
/* -------------------------------------------------------------------------- */

export const categoryZodSchema = union([
  l1CategoryZodSchema,
  l2CategoryZodSchema,
  l3CategoryZodSchema,
]);

/* -------------------------------------------------------------------------- */
/*                               UPDATE SCHEMA                                */
/* -------------------------------------------------------------------------- */

export const categoryUpdateZodSchema = union([
  l1CategoryZodSchema.partial().extend({ level: l1CategoryZodSchema.shape.level }),
  l2CategoryZodSchema.partial().extend({ level: l2CategoryZodSchema.shape.level }),
  l3CategoryZodSchema.partial().extend({ level: l3CategoryZodSchema.shape.level }),
]);
