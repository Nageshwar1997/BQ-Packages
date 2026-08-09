import type {
  DRAFT_PRODUCT_STEPPER_STEPS,
  DRAFT_PRODUCT_STEPPER_STEPS_MAP,
} from '@beautinique/shared-constants';

export type TDraftProductStepperStep = (typeof DRAFT_PRODUCT_STEPPER_STEPS)[number];
export type TDraftProductStepperStepMap = typeof DRAFT_PRODUCT_STEPPER_STEPS_MAP;
