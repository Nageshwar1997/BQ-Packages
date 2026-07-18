import type {
  categoryUpdateZodSchema,
  categoryZodSchema,
  imagesZodSchema,
  l1CategoryZodSchema,
  l2CategoryZodSchema,
  l3CategoryZodSchema,
  productMediaAndGallerySchema,
  productStockAndVariantsSchema,
  productVariantsZodSchema,
  productVariantZodSchema,
  productWithVariantsSchema,
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

export type TProductMediaAndGallerySchema = TInfer<typeof productMediaAndGallerySchema>;

export type TProductVariantZodSchema = TInfer<typeof productVariantZodSchema>;

export type TProductVariantsZodSchema = TInfer<typeof productVariantsZodSchema>;

export type TProductWithVariantsSchema = TInfer<typeof productWithVariantsSchema>;

export type TProductStockAndVariantsSchema = TInfer<typeof productStockAndVariantsSchema>;
