import { REGEX } from '@beautinique/shared-constants';
import {
  categoryLevelZodSchema,
  categoryNameAndDescriptionZodSchema,
  object,
  string,
  union,
} from '@beautinique/shared-zod';

/* -------------------------------------------------------------------------- */
/*                               COMMON SCHEMA                                */
/* -------------------------------------------------------------------------- */

const mainCategoryValidation = string('Main category is required.')
  .trim()
  .nonempty('Main category is required.')
  .length(24, 'Main category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9.')
  .regex(REGEX.NO_SPACE, 'Main category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9.')
  .regex(REGEX.MONGODB_ID, 'Main category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9.');

const subCategoryValidation = string('Sub-category is required.')
  .trim()
  .nonempty('Sub-category is required.')
  .length(24, 'Sub-category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9.')
  .regex(REGEX.NO_SPACE, 'Sub-category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9.')
  .regex(REGEX.MONGODB_ID, 'Sub-category is invalid. e.g. 63e5b8a5a4b0c2dabccce3f9.');

/* -------------------------------------------------------------------------- */
/*                               LEVEL 1 SCHEMA                               */
/* -------------------------------------------------------------------------- */

export const l1CategoryZodSchema = object({
  level: categoryLevelZodSchema.shape[1],
  name: categoryNameAndDescriptionZodSchema.shape.name,
});

/* -------------------------------------------------------------------------- */
/*                               LEVEL 2 SCHEMA                               */
/* -------------------------------------------------------------------------- */

export const l2CategoryZodSchema = object({
  level: categoryLevelZodSchema.shape[2],
  name: categoryNameAndDescriptionZodSchema.shape.name,
  mainCategory: mainCategoryValidation,
});

/* -------------------------------------------------------------------------- */
/*                               LEVEL 3 SCHEMA                               */
/* -------------------------------------------------------------------------- */

export const l3CategoryZodSchema = object({
  level: categoryLevelZodSchema.shape[3],
  name: categoryNameAndDescriptionZodSchema.shape.name,
  mainCategory: mainCategoryValidation,
  subCategory: subCategoryValidation,
});

/* -------------------------------------------------------------------------- */
/*                              COMBINED SCHEMA                               */
/* -------------------------------------------------------------------------- */

export const categoryZodSchema = union([
  l1CategoryZodSchema,
  l2CategoryZodSchema,
  l3CategoryZodSchema,
]);
