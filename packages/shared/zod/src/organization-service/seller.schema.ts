import {
  COUNTRIES,
  DRAFT_SELLER_STEP_MAP,
  REGEX,
  SELLER_APPROVAL_STATUS_MAP,
  SELLER_TYPES,
  STATES_AND_UTS,
} from '@beautinique/shared-constants';
import { discriminatedUnion, enum as enum_z, literal, object, string, type ZodLiteral } from 'zod';

import { emailValidation, phoneNumberValidation } from '../constants/index.js';

const draftSellerStepZodShape = Object.fromEntries(
  Object.values(DRAFT_SELLER_STEP_MAP).map((value) => [value, literal(value)]),
) as {
  readonly [K in (typeof DRAFT_SELLER_STEP_MAP)[keyof typeof DRAFT_SELLER_STEP_MAP]]: ZodLiteral<K>;
};

export const draftSellerStepZodSchema = object(draftSellerStepZodShape);

export const sellerBusinessDetailsZodSchema = object({
  step: draftSellerStepZodSchema.shape.businessDetails,
  name: string('Business name is required')
    .nonempty('Business name is required')
    .trim()
    .min(2, 'Business name must be at least 2 characters long')
    .max(100, 'Business name must be at most 100 characters long')
    .regex(REGEX.SINGLE_SPACE, 'Business name cannot contain consecutive spaces.'),
  type: enum_z(SELLER_TYPES, 'Business type is required'),
  email: emailValidation,
  phoneNumber: phoneNumberValidation,
  gstin: string('GSTIN is required')
    .trim()
    .nonempty('GSTIN is required')
    .toUpperCase()
    .regex(REGEX.GST, 'Enter a valid GSTIN'),
  pan: string('PAN is required')
    .trim()
    .nonempty('PAN is required')
    .toUpperCase()
    .regex(REGEX.PAN, 'Enter a valid PAN'),
});

export const sellerBankDetailsZodSchema = object({
  step: draftSellerStepZodSchema.shape.bankDetails,
  accountHolderName: string('Account holder name is required')
    .trim()
    .nonempty('Account holder name is required')
    .min(2, 'Account holder name must be at least 2 characters long.')
    .max(100, 'Account holder name must be at most 100 characters long.')
    .regex(REGEX.SINGLE_SPACE, "Account holder name can't contain multiple spaces.")
    .regex(REGEX.ONLY_LETTERS_AND_SPACES, 'Account holder name is invalid. e.g. "John Doe".'),
  accountNumber: string('Account number is required')
    .trim()
    .nonempty('Account number is required')
    .min(9, 'Enter valid account number')
    .max(18, 'Enter valid account number')
    .regex(REGEX.ACCOUNT_NUMBER, 'Enter a valid account number'),
  ifscCode: string('IFSC code is required')
    .trim()
    .nonempty('IFSC code is required')
    .toUpperCase()
    .regex(REGEX.IFSC, 'Enter a valid IFSC code'),
  bankName: string('Bank name is required').trim().nonempty('Bank name is required'),
});

export const sellerAddressZodSchema = object({
  step: draftSellerStepZodSchema.shape.address,
  line1: string('Address line 1 is required')
    .trim()
    .nonempty('Address line 1 is required')
    .min(2, 'Address line 1 must be at least 2 characters long.')
    .max(100, 'Address line 1 must be at most 100 characters long.')
    .regex(REGEX.SINGLE_SPACE, "Address line 1 can't contain multiple spaces."),
  line2: string('Address line 2 (optional)')
    .trim()
    .max(100, 'Address line 2 must be at most 100 characters long.')
    .optional(),
  city: string('City is required').trim().nonempty('City is required'),
  state: enum_z(STATES_AND_UTS, 'State is required'),
  pincode: string('Pincode is required')
    .trim()
    .nonempty('Pincode is required')
    .min(6, 'Enter valid pincode')
    .max(6, 'Enter valid pincode')
    .regex(REGEX.PIN_CODE, 'Enter a valid 6-digit pincode'),
  country: enum_z(COUNTRIES, 'Country is required'),
});

export const updateSellerApprovalStatusZodSchema = discriminatedUnion('approvalStatus', [
  object({ approvalStatus: literal(SELLER_APPROVAL_STATUS_MAP.APPROVED) }),
  object({
    approvalStatus: literal(SELLER_APPROVAL_STATUS_MAP.REJECTED),
    rejectReason: string('Reject reason is required').trim().nonempty('Reject reason is required'),
  }),
]);
