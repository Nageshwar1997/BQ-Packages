import { CATEGORY_LEVELS_MAP, REGEX } from '@beautinique/shared-constants';
import {
  categoryLevelZodSchema,
  categoryNameAndDescriptionZodSchema,
} from '@beautinique/shared-zod';
import { object, string, union } from 'zod';

/* -------------------------------------------------------------------------- */
/*                               COMMON SCHEMA                                */
/* -------------------------------------------------------------------------- */

const parentCategoryZodSchema = string('Parent category is required.')
  .trim()
  .nonempty('Parent category is required.')
  .length(24, 'Parent category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9.')
  .regex(REGEX.NO_SPACE, 'Parent category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9.')
  .regex(REGEX.MONGODB_ID, 'Parent category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9.');

/* -------------------------------------------------------------------------- */
/*                               LEVEL 1 SCHEMA                               */
/* -------------------------------------------------------------------------- */

export const l1CategoryZodSchema = object({
  level: categoryLevelZodSchema.shape[CATEGORY_LEVELS_MAP.L1],
  name: categoryNameAndDescriptionZodSchema.shape.name,
});

/* -------------------------------------------------------------------------- */
/*                               LEVEL 2 SCHEMA                               */
/* -------------------------------------------------------------------------- */

export const l2CategoryZodSchema = object({
  level: categoryLevelZodSchema.shape[CATEGORY_LEVELS_MAP.L2],
  name: categoryNameAndDescriptionZodSchema.shape.name,
  parent: parentCategoryZodSchema,
});

/* -------------------------------------------------------------------------- */
/*                               LEVEL 3 SCHEMA                               */
/* -------------------------------------------------------------------------- */

export const l3CategoryZodSchema = object({
  level: categoryLevelZodSchema.shape[CATEGORY_LEVELS_MAP.L3],
  name: categoryNameAndDescriptionZodSchema.shape.name,
  parent: parentCategoryZodSchema,
  description: categoryNameAndDescriptionZodSchema.shape.description,
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
