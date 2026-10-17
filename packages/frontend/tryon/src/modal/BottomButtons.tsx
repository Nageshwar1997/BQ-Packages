import { Icon } from '@iconify/react';

import { TRYON_MODE_MAP } from '../constants/index.js';
import type { TTryOnMode } from '../types/index.js';

// Mobile/tablet only - stands in for the sidebar above. The mode button toggles directly
// (matching the desktop sidebar's own mode toggle) - no picker UI needed for a straight either/or
// choice; Models still opens a sheet since there are more than two of those to choose from.
//
// Two equal-width, thumb-sized (min 44px tall) buttons: the mode switch reads as a calm secondary
// action, Models gets the brand gradient since it's the one that opens the "pick a face" flow.
const BottomButtons = ({
  mode,
  step,
  isTryOnReady,
  onModeToggle,
  onModelsClick,
}: {
  mode: TTryOnMode;
  step: 'tryon' | 'select' | 'instructions';
  isTryOnReady: boolean;
  onModelsClick: (sheet: 'models') => void;
  onModeToggle: (mode: TTryOnMode) => void;
}) => {
  const isLive = mode === TRYON_MODE_MAP.LIVE;
  const modelsDisabled = step === 'tryon' && !isTryOnReady;

  return (
    <div className="flex shrink-0 gap-2 lg:hidden">
      <button
        type="button"
        onClick={() => {
          onModeToggle(isLive ? TRYON_MODE_MAP.UPLOAD : TRYON_MODE_MAP.LIVE);
        }}
        className="border-primary/10 bg-secondary-invert text-primary hover:border-blue-crayola-c/50 focus-visible:outline-blue-crayola-c flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium shadow-sm transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
      >
        <Icon
          icon={isLive ? 'solar:gallery-send-linear' : 'solar:camera-linear'}
          className="text-blue-crayola-c size-5 shrink-0"
        />
        {`Try ${isLive ? 'Upload' : 'Live'}`}
      </button>
      <button
        type="button"
        disabled={modelsDisabled}
        onClick={() => {
          onModelsClick('models');
        }}
        className="bg-sky-blue-burst shadow-secondary-btn focus-visible:outline-blue-crayola-c flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-white transition-all duration-300 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
      >
        <Icon icon="solar:gallery-linear" className="size-5 shrink-0" />
        Models
      </button>
    </div>
  );
};

export default BottomButtons;
