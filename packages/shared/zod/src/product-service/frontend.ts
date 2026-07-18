import { array, discriminatedUnion, literal, object } from 'zod';

import {
  imageUnionZodSchema,
  thumbnailUnionZodSchema,
  videoUnionZodSchema,
} from '../common/index.js';
import { baseVariantZodSchema, withoutVariantsSchema } from './product.schema.js';

const imagesSchema = array(imageUnionZodSchema, 'Images are required.')
  .min(1, 'At least one image is required.')
  .max(10, 'Maximum of 10 images are allowed.');

export const productMediaAndGallerySchema = object({
  thumbnail: thumbnailUnionZodSchema,
  images: imagesSchema,
  video: videoUnionZodSchema.optional(),
});

const variantSchema = baseVariantZodSchema.and(
  object({
    thumbnail: thumbnailUnionZodSchema.optional(),
    images: imagesSchema,
  }),
);

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
