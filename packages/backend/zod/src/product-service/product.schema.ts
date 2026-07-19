import {
  draftProductStepZodSchema,
  imageUrlValidation,
  productBaseVariantZodSchema,
  productBasicInfoZodSchema,
  productDescriptionAndContentZodSchema,
  productTryOnConfigurationZodSchema,
  productWithoutVariantsZodSchema,
  thumbnailUrlValidation,
  videoUrlValidation,
} from '@beautinique/shared-zod';
import { array, discriminatedUnion, literal, object } from 'zod';

export const imagesZodSchema = array(imageUrlValidation, 'Images are required.')
  .min(1, 'At least one image is required.')
  .max(10, 'Maximum of 10 images are allowed.');

export const productMediaAndGallerySchema = object({
  step: draftProductStepZodSchema.shape.mediaAndGallery,
  thumbnail: thumbnailUrlValidation,
  images: imagesZodSchema,
  video: videoUrlValidation.optional(),
});

export const productVariantZodSchema = productBaseVariantZodSchema.and(
  object({
    thumbnail: thumbnailUrlValidation.optional(),
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
  step: draftProductStepZodSchema.shape.stockAndVariants,
  variants: productVariantsZodSchema,
});

export const productStockAndVariantsSchema = discriminatedUnion(
  'hasVariants',
  [productWithoutVariantsZodSchema, productWithVariantsSchema],
  'Please specify whether product has variants.',
);

export const draftProductDetailsZodSchema = object({
  basicInfo: productBasicInfoZodSchema,
  mediaAndGallery: productMediaAndGallerySchema,
  descriptionAndContent: productDescriptionAndContentZodSchema,
  stockAndVariants: productStockAndVariantsSchema,
  tryOnConfiguration: productTryOnConfigurationZodSchema,
});
