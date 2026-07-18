import type {
  infer as Infer,
  productBaseVariantZodSchema,
  productBasicInfoZodSchema,
  productDescriptionAndContentZodSchema,
  productTryOnConfigurationZodSchema,
  productWithoutVariantsZodSchema,
} from '@beautinique/shared-zod';

export type TProductBasicInfoZodSchema = Infer<typeof productBasicInfoZodSchema>;

export type TProductDescriptionAndContentZodSchema = Infer<
  typeof productDescriptionAndContentZodSchema
>;

export type TProductBaseVariantZodSchema = Infer<typeof productBaseVariantZodSchema>;

export type TProductWithoutVariantsZodSchema = Infer<typeof productWithoutVariantsZodSchema>;

export type TProductTryOnConfigurationZodSchema = Infer<typeof productTryOnConfigurationZodSchema>;
