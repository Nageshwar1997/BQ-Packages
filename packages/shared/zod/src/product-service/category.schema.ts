import { CATEGORY_LEVELS_MAP, REGEX } from '@beautinique/shared-constants';
import { literal, object, string } from 'zod';

/* -------------------------------------------------------------------------- */
/*                      CATEGORY NAME & DESCRIPTION SCHEMA                    */
/* -------------------------------------------------------------------------- */

export const categoryNameAndDescriptionZodSchema = object({
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
});

/* -------------------------------------------------------------------------- */
/*                             CATEGORY LEVEL SCHEMA                          */
/* -------------------------------------------------------------------------- */

export const categoryLevelZodSchema = object({
  [CATEGORY_LEVELS_MAP.L1]: literal(CATEGORY_LEVELS_MAP.L1, {
    message: `Category level must be ${String(CATEGORY_LEVELS_MAP.L1)}.`,
  }),
  [CATEGORY_LEVELS_MAP.L2]: literal(CATEGORY_LEVELS_MAP.L2, {
    message: `Category level must be ${String(CATEGORY_LEVELS_MAP.L2)}.`,
  }),
  [CATEGORY_LEVELS_MAP.L3]: literal(CATEGORY_LEVELS_MAP.L3, {
    message: `Category level must be ${String(CATEGORY_LEVELS_MAP.L3)}.`,
  }),
});
