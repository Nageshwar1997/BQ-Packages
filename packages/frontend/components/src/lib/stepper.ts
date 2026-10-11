export type TStepState = 'completed' | 'active' | 'upcoming';

/**
 * The step that is the current one: `activeStep` kept inside the steps. A number past the ends (or
 * with a fraction) is put on the nearest step, and `NaN` is the first, so a wrong value never makes
 * every step look completed or none look current.
 */
export const getCurrentStep = (activeStep: number, count: number) =>
  Number.isNaN(activeStep)
    ? 0
    : Math.min(Math.max(Math.trunc(activeStep), 0), Math.max(count - 1, 0));

export const getStepState = (index: number, currentStep: number): TStepState => {
  if (index < currentStep) return 'completed';

  return index === currentStep ? 'active' : 'upcoming';
};
