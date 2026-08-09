import { DRAFT_SELLER_STEP_MAP } from '@beautinique/backend-constants';
import {
  draftSellerStepZodSchema,
  imageUrlValidation,
  object,
  sellerAddressZodSchema,
  sellerBankDetailsZodSchema,
  sellerBusinessDetailsZodSchema,
} from '@beautinique/shared-zod';

export const sellerDocumentsZodSchema = object({
  step: draftSellerStepZodSchema.shape.documents,
  id: imageUrlValidation,
  address: imageUrlValidation,
  license: imageUrlValidation,
  pan: imageUrlValidation,
  gst: imageUrlValidation,
  bank: imageUrlValidation,
});

export const draftSellerDetailsZodSchema = object({
  [DRAFT_SELLER_STEP_MAP[0]]: sellerBusinessDetailsZodSchema,
  [DRAFT_SELLER_STEP_MAP[1]]: sellerBankDetailsZodSchema,
  [DRAFT_SELLER_STEP_MAP[2]]: sellerAddressZodSchema,
  [DRAFT_SELLER_STEP_MAP[3]]: sellerDocumentsZodSchema,
});

export const draftSellerStepBodyZodSchema = sellerBusinessDetailsZodSchema
  .or(sellerBankDetailsZodSchema)
  .or(sellerAddressZodSchema)
  .or(sellerDocumentsZodSchema);
