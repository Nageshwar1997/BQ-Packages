import { array, discriminatedUnion, literal, object } from 'zod';

import {
  imageUnionZodSchema,
  thumbnailUnionZodSchema,
  videoUnionZodSchema,
} from '../common/index.js';
import { productBaseVariantZodSchema, productWithoutVariantsZodSchema } from './product.schema.js';

export const imagesZodSchema = array(imageUnionZodSchema, 'Images are required.')
  .min(1, 'At least one image is required.')
  .max(10, 'Maximum of 10 images are allowed.');

export const productMediaAndGallerySchema = object({
  thumbnail: thumbnailUnionZodSchema,
  images: imagesZodSchema,
  video: videoUnionZodSchema.optional(),
});

export const productVariantZodSchema = productBaseVariantZodSchema.and(
  object({
    thumbnail: thumbnailUnionZodSchema.optional(),
    images: imagesZodSchema,
  }),
);

export const productVariantsZodSchema = array(
  productVariantZodSchema,
  'At least one variant is required.',
)
  .nonempty('At least one variant is required.')
  .min(1, 'Minimum one variant is required.');

export const productWithVariantsSchema = object({
  hasVariants: literal(true),
  variants: productVariantsZodSchema,
});

export const productStockAndVariantsSchema = discriminatedUnion(
  'hasVariants',
  [productWithoutVariantsZodSchema, productWithVariantsSchema],
  'Please specify whether product has variants.',
);
