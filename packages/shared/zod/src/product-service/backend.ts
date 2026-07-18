import { REGEX, VARIANT_TYPES_MAP } from '@beautinique/shared-constants';
import { array, discriminatedUnion, literal, object } from 'zod';

import {
  imageUrlValidation,
  thumbnailUrlValidation,
  videoUrlValidation,
} from '../constants/index.js';
import { baseVariantZodSchema, withoutVariantsSchema } from './product.schema.js';

export const thumbnailZodSchema = thumbnailUrlValidation;
export const videoZodSchema = videoUrlValidation;
export const imageZodSchema = imageUrlValidation;

const imagesSchema = array(imageZodSchema, 'Images are required.')
  .min(1, 'At least one image is required.')
  .max(10, 'Maximum of 10 images are allowed.');

export const productMediaAndGallerySchema = object({
  thumbnail: thumbnailZodSchema,
  images: imagesSchema,
  video: videoZodSchema.optional(),
});

const variantSchema = baseVariantZodSchema
  .extend({
    thumbnail: thumbnailZodSchema.optional(),
    images: imagesSchema,
  })
  .superRefine((data, ctx) => {
    /* -------------------------------------------------------------------------- */
    /*                               COMMON CHECKS                                 */
    /* -------------------------------------------------------------------------- */

    const value = data.value.trim();

    if (data.sellingPrice > data.originalPrice) {
      ctx.addIssue({
        code: 'custom',
        path: ['sellingPrice'],
        message: 'Selling price cannot be greater than original price.',
      });
    }

    if (data.stockThreshold >= data.stock) {
      ctx.addIssue({
        code: 'custom',
        path: ['stockThreshold'],
        message: 'Stock threshold must be less than stock.',
      });
    }

    /* -------------------------------------------------------------------------- */
    /*                               COLOR VARIANT                                */
    /* -------------------------------------------------------------------------- */

    if (data.type === VARIANT_TYPES_MAP.Color && value) {
      const isValidHex = REGEX.HEX_CODE.test(value);
      if (!isValidHex) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Invalid hex color code.',
        });
      }
    }

    /* -------------------------------------------------------------------------- */
    /*                                TEXT VARIANT                                */
    /* -------------------------------------------------------------------------- */

    if (data.type === VARIANT_TYPES_MAP.Text && value) {
      if (value.trim().length > 50) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Variant value cannot exceed 50 characters.',
        });
      }
      if (value.trim().length < 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Variant value must be at least 2 character.',
        });
      }
    }
  });

export const withVariantsSchema = object({
  hasVariants: literal(true),
  variants: array(variantSchema, 'At least one variant is required.')
    .nonempty('At least one variant is required.')
    .min(1, 'Minimum one variant is required.'),
});

export const productStockAndVariantsSchema = discriminatedUnion(
  'hasVariants',
  [withoutVariantsSchema, withVariantsSchema],
  'Please specify whether product has variants.',
);
