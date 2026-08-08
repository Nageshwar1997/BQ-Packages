import { DRAFT_PRODUCT_STEP_MAP } from '@beautinique/backend-constants';
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

export const productMediaAndGalleryZodSchema = object({
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

export const productWithVariantsZodSchema = object({
  hasVariants: literal(true),
  step: draftProductStepZodSchema.shape.stockAndVariants,
  variants: productVariantsZodSchema,
});

export const productStockAndVariantsZodSchema = discriminatedUnion(
  'hasVariants',
  [productWithoutVariantsZodSchema, productWithVariantsZodSchema],
  'Please specify whether product has variants.',
);

export const draftProductDetailsZodSchema = object({
  [DRAFT_PRODUCT_STEP_MAP[0]]: productBasicInfoZodSchema,
  [DRAFT_PRODUCT_STEP_MAP[1]]: productMediaAndGalleryZodSchema,
  [DRAFT_PRODUCT_STEP_MAP[2]]: productDescriptionAndContentZodSchema,
  [DRAFT_PRODUCT_STEP_MAP[3]]: productStockAndVariantsZodSchema,
  [DRAFT_PRODUCT_STEP_MAP[4]]: productTryOnConfigurationZodSchema,
});

export const draftProductStepBodyZodSchema = productBasicInfoZodSchema
  .or(productMediaAndGalleryZodSchema)
  .or(productDescriptionAndContentZodSchema)
  .or(productStockAndVariantsZodSchema)
  .or(productTryOnConfigurationZodSchema);
