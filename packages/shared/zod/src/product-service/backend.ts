import { array, discriminatedUnion, literal, object } from 'zod';

import {
  imageUrlValidation,
  thumbnailUrlValidation,
  videoUrlValidation,
} from '../constants/index.js';
import { baseVariantZodSchema, withoutVariantsSchema } from './product.schema.js';

const imagesSchema = array(imageUrlValidation, 'Images are required.')
  .min(1, 'At least one image is required.')
  .max(10, 'Maximum of 10 images are allowed.');

export const productMediaAndGallerySchema = object({
  thumbnail: thumbnailUrlValidation,
  images: imagesSchema,
  video: videoUrlValidation.optional(),
});

const variantSchema = baseVariantZodSchema.and(
  object({
    thumbnail: thumbnailUrlValidation.optional(),
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
