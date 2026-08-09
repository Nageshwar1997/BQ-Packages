import type {
  draftSellerDetailsZodSchema,
  draftSellerStepBodyZodSchema,
  sellerDocumentsZodSchema,
  TInfer,
} from '@beautinique/backend-zod';

/* ======================== SELLER ======================== */
export type TSellerDocumentsZodSchema = TInfer<typeof sellerDocumentsZodSchema>;

export type TDraftSellerDetailsZodSchema = TInfer<typeof draftSellerDetailsZodSchema>;

export type TDraftSellerStepBodyZodSchema = TInfer<typeof draftSellerStepBodyZodSchema>;
