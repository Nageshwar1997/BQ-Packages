import type {
  createContactQueryZodSchema,
  sellerAddressZodSchema,
  sellerBankDetailsZodSchema,
  sellerBusinessDetailsZodSchema,
  sellerIdParamsZodSchema,
  TInfer,
  updateSellerApprovalStatusZodSchema,
} from '@beautinique/shared-zod';

/* ======================== CONTACT ======================== */
export type TCreateContactQueryZodSchema = TInfer<typeof createContactQueryZodSchema>;

/* ======================== SELLER ======================== */
export type TSellerBusinessDetailsZodSchema = TInfer<typeof sellerBusinessDetailsZodSchema>;
export type TSellerBankDetailsZodSchema = TInfer<typeof sellerBankDetailsZodSchema>;
export type TSellerAddressZodSchema = TInfer<typeof sellerAddressZodSchema>;
export type TSellerIdParamsZodSchema = TInfer<typeof sellerIdParamsZodSchema>;
export type TUpdateSellerApprovalStatusZodSchema = TInfer<
  typeof updateSellerApprovalStatusZodSchema
>;
