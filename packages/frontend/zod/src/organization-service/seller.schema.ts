import { DRAFT_SELLER_STEP_MAP } from '@beautinique/backend-constants';
import {
  draftSellerStepZodSchema,
  imageUnionZodSchema,
  object,
  sellerAddressZodSchema,
  sellerBankDetailsZodSchema,
  sellerBusinessDetailsZodSchema,
} from '@beautinique/shared-zod';

export const sellerDocumentsZodSchema = object({
  step: draftSellerStepZodSchema.shape.documents,
  id: imageUnionZodSchema,
  address: imageUnionZodSchema,
  license: imageUnionZodSchema,
  pan: imageUnionZodSchema,
  gst: imageUnionZodSchema,
  bank: imageUnionZodSchema,
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
