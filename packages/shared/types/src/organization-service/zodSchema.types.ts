import type {
  createContactQueryZodSchema,
  sellerAddressZodSchema,
  sellerBankDetailsZodSchema,
  sellerBusinessDetailsZodSchema,
  TInfer,
  updateSellerApprovalStatusZodSchema,
} from '@beautinique/shared-zod';

/* ======================== CONTACT ======================== */
export type TCreateContactQueryZodSchema = TInfer<typeof createContactQueryZodSchema>;

/* ======================== SELLER ======================== */
export type TSellerBusinessDetailsZodSchema = TInfer<typeof sellerBusinessDetailsZodSchema>;

export type TSellerBankDetailsZodSchema = TInfer<typeof sellerBankDetailsZodSchema>;

export type TSellerAddressZodSchema = TInfer<typeof sellerAddressZodSchema>;

export type TUpdateSellerApprovalStatusZodSchema = TInfer<
  typeof updateSellerApprovalStatusZodSchema
>;
