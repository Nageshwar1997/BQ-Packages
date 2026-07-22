import type {
  categoryUpdateZodSchema,
  categoryZodSchema,
  draftProductDetailsZodSchema,
  draftProductStepBodyZodSchema,
  imagesZodSchema,
  l1CategoryZodSchema,
  l2CategoryZodSchema,
  l3CategoryZodSchema,
  productMediaAndGalleryZodSchema,
  productStockAndVariantsZodSchema,
  productVariantsZodSchema,
  productVariantZodSchema,
  productWithVariantsZodSchema,
  TInfer,
} from '@beautinique/backend-zod';

/* ================== CATEGORY ================== */

export type TL1CategoryZodSchema = TInfer<typeof l1CategoryZodSchema>;

export type TL2CategoryZodSchema = TInfer<typeof l2CategoryZodSchema>;

export type TL3CategoryZodSchema = TInfer<typeof l3CategoryZodSchema>;

export type TCategoryZodSchema = TInfer<typeof categoryZodSchema>;

export type TCategoryUpdateZodSchema = TInfer<typeof categoryUpdateZodSchema>;

/* ================== COMMON ================== */

export type TImagesZodSchema = TInfer<typeof imagesZodSchema>;

/* ================== PRODUCT ================== */

export type TProductMediaAndGalleryZodSchema = TInfer<typeof productMediaAndGalleryZodSchema>;

export type TProductVariantZodSchema = TInfer<typeof productVariantZodSchema>;

export type TProductVariantsZodSchema = TInfer<typeof productVariantsZodSchema>;

export type TProductWithVariantsZodSchema = TInfer<typeof productWithVariantsZodSchema>;

export type TProductStockAndVariantsZodSchema = TInfer<typeof productStockAndVariantsZodSchema>;

export type TDraftProductDetailsZodSchema = TInfer<typeof draftProductDetailsZodSchema>;

export type TDraftProductStepBodyZodSchema = TInfer<typeof draftProductStepBodyZodSchema>;
