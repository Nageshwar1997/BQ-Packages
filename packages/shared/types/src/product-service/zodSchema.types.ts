import type {
  productBaseVariantZodSchema,
  productBasicInfoZodSchema,
  productDescriptionAndContentZodSchema,
  productTryOnConfigurationZodSchema,
  productWithoutVariantsZodSchema,
  TInfer,
} from '@beautinique/shared-zod';

export type TProductBasicInfoZodSchema = TInfer<typeof productBasicInfoZodSchema>;

export type TProductDescriptionAndContentZodSchema = TInfer<
  typeof productDescriptionAndContentZodSchema
>;

export type TProductBaseVariantZodSchema = TInfer<typeof productBaseVariantZodSchema>;

export type TProductWithoutVariantsZodSchema = TInfer<typeof productWithoutVariantsZodSchema>;

export type TProductTryOnConfigurationZodSchema = TInfer<typeof productTryOnConfigurationZodSchema>;
