import {
  array,
  discriminatedUnion,
  draftProductStepZodSchema,
  imageUnionZodSchema,
  literal,
  object,
  productBaseVariantZodSchema,
  productBasicInfoZodSchema,
  productDescriptionAndContentZodSchema,
  productTryOnConfigurationZodSchema,
  productWithoutVariantsZodSchema,
  thumbnailUnionZodSchema,
  videoUnionZodSchema,
} from '@beautinique/shared-zod';

export const imagesZodSchema = array(imageUnionZodSchema, 'Images are required.')
  .min(1, 'At least one image is required.')
  .max(10, 'Maximum of 10 images are allowed.');

export const productMediaAndGalleryZodSchema = object({
  step: draftProductStepZodSchema.shape.mediaAndGallery,
  thumbnail: thumbnailUnionZodSchema,
  images: imagesZodSchema,
  video: videoUnionZodSchema.optional(),
});

export const productVariantZodSchema = productBaseVariantZodSchema.and(
  object({ thumbnail: thumbnailUnionZodSchema.optional(), images: imagesZodSchema }),
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
  basicInfo: productBasicInfoZodSchema,
  mediaAndGallery: productMediaAndGalleryZodSchema,
  descriptionAndContent: productDescriptionAndContentZodSchema,
  stockAndVariants: productStockAndVariantsZodSchema,
  tryOnConfiguration: productTryOnConfigurationZodSchema,
});

export const draftProductStepBodyZodSchema = productBasicInfoZodSchema
  .or(productMediaAndGalleryZodSchema)
  .or(productDescriptionAndContentZodSchema)
  .or(productStockAndVariantsZodSchema)
  .or(productTryOnConfigurationZodSchema);
