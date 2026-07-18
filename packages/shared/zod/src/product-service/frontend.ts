import { array, discriminatedUnion, literal, object, union } from 'zod';

import {
  imageFileValidation,
  imageUrlValidation,
  thumbnailFileValidation,
  thumbnailUrlValidation,
  videoFileValidation,
  videoUrlValidation,
} from '../constants/index.js';
import { baseVariantZodSchema, withoutVariantsSchema } from './product.schema.js';

export const thumbnailZodSchema = union([thumbnailFileValidation, thumbnailUrlValidation]);
export const videoZodSchema = union([videoFileValidation, videoUrlValidation]);
export const imageZodSchema = union([imageFileValidation, imageUrlValidation]);

const imagesSchema = array(imageZodSchema, 'Images are required.')
  .min(1, 'At least one image is required.')
  .max(10, 'Maximum of 10 images are allowed.');

export const productMediaAndGallerySchema = object({
  thumbnail: thumbnailZodSchema,
  images: imagesSchema,
  video: videoZodSchema.optional(),
});

// Cross-field checks (price, stock threshold, hex/text `value` rules) already
// run as part of `baseVariantZodSchema` itself - `.extend()` carries them
// forward, so they don't need to be (and shouldn't be duplicated) here too.
const variantSchema = baseVariantZodSchema.and(
  object({
    thumbnail: thumbnailZodSchema.optional(),
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
