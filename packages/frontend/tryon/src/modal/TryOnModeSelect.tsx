import { GradientText } from '@beautinique/frontend-components';
import { Icon } from '@iconify/react';

import { TRYON_MODE_OPTIONS } from '../constants/index.js';
import type { TTryOnMode } from '../types/index.js';

interface ITryOnModeSelectProps {
  onSelect: (mode: TTryOnMode) => void;
}

// Step 1 of the flow - picking a mode advances to the instructions step for that mode (see
// TryOnModal's `handleSelectMode`), not straight to the camera/upload picker.
//
// The outer box scrolls and the inner one centers (`min-h-full` + `justify-center`) rather than
// one `h-full justify-center` box doing both - on a short viewport (landscape phone) centering a
// column taller than its parent pushes its top half out of reach with no way to scroll up to it,
// whereas this lets it center when it fits and scroll normally when it doesn't.
const TryOnModeSelect = ({ onSelect }: ITryOnModeSelectProps) => (
  <div className="h-full overflow-y-auto">
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center gap-6 p-5 sm:p-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <GradientText
          type="accent"
          text="How would you like to try it?"
          className="text-xl font-semibold sm:text-2xl"
        />
        <p className="text-tertiary max-w-sm text-xs sm:text-sm">
          See the shade on you before you buy - pick whichever is easier right now.
        </p>
      </div>

      <div className="grid w-full gap-3 sm:grid-cols-2 sm:gap-4">
        {TRYON_MODE_OPTIONS.map(({ icon, mode, title, description }) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              onSelect(mode);
            }}
            className="group border-primary/10 bg-secondary-invert hover:border-blue-crayola-c/50 focus-visible:outline-blue-crayola-c relative flex cursor-pointer flex-row items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 sm:flex-col sm:gap-3 sm:p-6 sm:text-center"
          >
            {/* Soft brand glow that fades in on hover/focus - purely decorative. */}
            <span
              aria-hidden
              className="from-blue-crayola-c/10 pointer-events-none absolute inset-0 bg-linear-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
            />
            <span className="bg-accent-duo shadow-secondary-btn relative flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 sm:size-14">
              <Icon icon={icon} className="size-6 text-white sm:size-7" />
            </span>
            <span className="relative flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-none sm:gap-1">
              <span className="text-primary text-sm font-semibold sm:text-base">{title}</span>
              <span className="text-tertiary text-xs">{description}</span>
            </span>
            <Icon
              icon="solar:arrow-right-linear"
              className="text-primary/40 group-hover:text-blue-crayola-c relative size-5 shrink-0 transition-all duration-300 group-hover:translate-x-1 sm:hidden"
            />
          </button>
        ))}
      </div>

      <p className="text-primary/50 flex items-center gap-1.5 text-center text-[11px] sm:text-xs">
        <Icon icon="solar:shield-check-linear" className="size-3.5 shrink-0" />
        Runs in your browser - your photo and camera frames aren&apos;t uploaded or stored.
      </p>
    </div>
  </div>
);

export default TryOnModeSelect;
