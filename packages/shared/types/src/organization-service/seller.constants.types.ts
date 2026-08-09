import type {
  DRAFT_SELLER_STEP_MAP,
  SELLER_APPROVAL_STATUS_MAP,
  SELLER_APPROVAL_STATUSES,
  SELLER_STATUS_MAP,
  SELLER_STATUSES,
  SELLER_STEPPER_STEPS,
  SELLER_STEPPER_STEPS_MAP,
  SELLER_TYPE_MAP,
  SELLER_TYPES,
} from '@beautinique/shared-constants';

export type TSellerType = (typeof SELLER_TYPES)[number];
export type TSellerTypeMap = typeof SELLER_TYPE_MAP;

export type TSellerApprovalStatus = (typeof SELLER_APPROVAL_STATUSES)[number];
export type TSellerApprovalStatusMap = typeof SELLER_APPROVAL_STATUS_MAP;

export type TSellerStatus = (typeof SELLER_STATUSES)[number];
export type TSellerStatusMap = typeof SELLER_STATUS_MAP;

export type TDraftSellerStepMap = typeof DRAFT_SELLER_STEP_MAP;
export type TSellerStep = (typeof SELLER_STEPPER_STEPS)[number];
export type TSellerStepMap = typeof SELLER_STEPPER_STEPS_MAP;
