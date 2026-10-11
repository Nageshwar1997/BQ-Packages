import { Icon } from '@iconify/react';
import type { ComponentProps, CSSProperties } from 'react';

import { hasContent } from '../lib/content.js';
import { getCurrentStep, getStepState, type TStepState } from '../lib/stepper.js';
import { registerStepperIcons } from './stepper-icons.js';

export interface IStepperStep {
  title: string;
  description?: string;
  /**
   * An Iconify name (`'solar:user-linear'`) shown in the circle while the step is not completed; the
   * step's number if left out. Iconify downloads it the first time it is shown and draws it in the
   * browser, not on a server: to have it without a network, bundle it in the app (`addCollection`).
   */
  icon?: string;
  /** Cannot be clicked. Only matters when `onStepClick` is given. */
  disabled?: boolean;
}

export interface IStepper extends ComponentProps<'div'> {
  steps: readonly IStepperStep[];
  /** The index of the current step: the ones before it are completed, the ones after it are upcoming. */
  activeStep: number;
  /** Makes the steps buttons. It gets the index of the step that was clicked. */
  onStepClick?: (step: number) => void;
  /** Names the list of steps for assistive technology, e.g. `"Checkout progress"`. */
  label?: string;
  /**
   * What assistive technology reads before the title of a completed step, which otherwise only shows
   * a tick.
   * @default 'Completed'
   */
  completedLabel?: string;
}

const ITEM_CSS =
  'group relative flex min-w-0 items-start gap-3 text-left md:flex-col md:items-center md:gap-3 md:px-2';
// No `outline-hidden`: in Tailwind v4 it sets `--tw-outline-style: none`, which the
// `focus-visible:outline-2` below uses for its style, so the ring would never be drawn. A button only
// shows the browser's own ring for the keyboard anyway (`:focus-visible`), never for a click.
const CLICKABLE_CSS =
  'cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-crayola-c disabled:cursor-not-allowed disabled:opacity-50';

const CIRCLE_CSS =
  'relative z-1 flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-300 motion-reduce:transition-none md:size-11';

// `Record`s: a new state is a type error here until it has a look. Every state also looks different
// in forced-colors mode (Windows high contrast), where backgrounds and shadows are not drawn.
const CIRCLE_STATE_CSS: Record<TStepState, string> = {
  completed:
    'border-blue-crayola-c bg-accent-duo text-white shadow-[0_8px_24px_rgba(var(--blue-crayola-c-rgb),0.28)] forced-colors:border-[Highlight] forced-colors:bg-[Highlight] forced-colors:bg-none forced-colors:text-[HighlightText]',
  active:
    'border-blue-crayola-c bg-primary-invert text-primary shadow-[0_0_0_5px_rgba(var(--blue-crayola-c-rgb),0.12)] forced-colors:border-[Highlight] forced-colors:border-4',
  upcoming:
    'border-primary/20 bg-primary-invert text-primary/60 forced-colors:border-[GrayText] forced-colors:text-[GrayText]',
};

const TITLE_STATE_CSS: Record<TStepState, string> = {
  completed: 'text-primary/80',
  active: 'text-primary',
  upcoming: 'text-primary/45 forced-colors:text-[GrayText]',
};

const DESCRIPTION_STATE_CSS: Record<TStepState, string> = {
  completed: 'text-primary/35',
  active: 'text-secondary',
  upcoming: 'text-primary/35 forced-colors:text-[GrayText]',
};

const CONNECTOR_BASE_CSS =
  'absolute top-10 left-5 h-4 w-0.5 -translate-x-1/2 md:top-5 md:left-[calc(50%+1.375rem)] md:h-0.5 md:w-[calc(100%-2.75rem)] md:translate-x-0';

/**
 * A row of steps with the current one marked, for a checkout, a sign-up or any other wizard. The
 * steps are an ordered list; the current one has `aria-current="step"`. With `onStepClick` the steps
 * are buttons, and the content in `children` is shown under them.
 */
export const Stepper = ({
  steps,
  activeStep,
  onStepClick,
  label,
  completedLabel = 'Completed',
  className = '',
  children,
  ...divProps
}: IStepper) => {
  registerStepperIcons();

  const currentStep = getCurrentStep(activeStep, steps.length);

  return (
    <div
      {...divProps}
      className={`flex w-full flex-col gap-6 p-4 shadow-sm sm:p-5 lg:p-6 ${className}`}
    >
      {steps.length > 0 && (
        <ol
          aria-label={label}
          style={{ '--steps-count': steps.length } as CSSProperties}
          className="m-0 flex list-none flex-col gap-4 p-0 md:grid md:grid-cols-[repeat(var(--steps-count),minmax(0,1fr))] md:gap-0"
        >
          {steps.map((step, index) => {
            const state = getStepState(index, currentStep);
            const hasNextStep = index < steps.length - 1;

            const content = (
              <>
                {hasNextStep && (
                  <span
                    aria-hidden="true"
                    className={`${CONNECTOR_BASE_CSS} ${
                      state === 'completed'
                        ? 'bg-accent-duo forced-colors:bg-[Highlight] forced-colors:bg-none'
                        : 'bg-primary/20 forced-colors:bg-[GrayText]'
                    }`}
                  />
                )}

                <span aria-hidden="true" className={`${CIRCLE_CSS} ${CIRCLE_STATE_CSS[state]}`}>
                  {state === 'completed' ? (
                    <Icon icon="solar:check-read-linear" className="size-5" />
                  ) : step.icon ? (
                    <Icon icon={step.icon} className="size-5" />
                  ) : (
                    index + 1
                  )}
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5 md:items-center md:pt-0 md:text-center">
                  <span
                    className={`line-clamp-1 text-sm font-semibold md:text-[13px] lg:text-sm ${TITLE_STATE_CSS[state]}`}
                  >
                    {state === 'completed' && (
                      <span className="sr-only">{`${completedLabel}: `}</span>
                    )}
                    {step.title}
                  </span>
                  {hasContent(step.description) && (
                    <span
                      className={`line-clamp-1 text-xs leading-4 md:line-clamp-2 ${DESCRIPTION_STATE_CSS[state]}`}
                    >
                      {step.description}
                    </span>
                  )}
                </span>
              </>
            );

            return (
              // The steps are a fixed order that is never sorted or filtered, and two can have the
              // same title: the place is what tells them apart.
              <li
                key={index}
                data-state={state}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                {onStepClick ? (
                  <button
                    type="button"
                    disabled={step.disabled}
                    onClick={() => {
                      onStepClick(index);
                    }}
                    className={`${ITEM_CSS} ${CLICKABLE_CSS} w-full`}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={`${ITEM_CSS} cursor-default`}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {hasContent(children) && <div className="border-primary/10 border-t pt-5">{children}</div>}
    </div>
  );
};
