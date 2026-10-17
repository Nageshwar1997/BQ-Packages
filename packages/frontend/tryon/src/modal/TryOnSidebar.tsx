import type { TTryOnCategory } from '@beautinique/frontend-types';
import { Icon } from '@iconify/react';
import { type RefObject } from 'react';

import { TRYON_MODE_MAP, TRYON_MODE_OPTIONS } from '../constants/index.js';
import type { TTryOnMode } from '../types/index.js';

import TryOnModelList from './TryOnModelList.js';

interface ITryOnSidebarProps {
  category: TTryOnCategory;
  mode: TTryOnMode;
  // Always resets the flow back to that mode's instructions screen (even re-clicking the
  // already-active mode) - matches the reference's onCameraClick/onUploadClick, and doubles as
  // a "start over"/"pick a different photo" action. The actual camera-start/file-picker trigger
  // lives on the instructions screen from there, not here.
  onModeToggle: (mode: TTryOnMode) => void;
  cameraVideoRef: RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  previewImageUrl: string | null;
  onModelSelect: (url: string) => void;
  // Picking a different model before the current one has even finished loading is a no-op at
  // best - disable just the model list (mode-toggle stays clickable, so switching away or
  // retrying is always possible).
  modelsDisabled?: boolean;
}

// Short labels for the sidebar's narrow segmented toggle - `TRYON_MODE_OPTIONS`'s own titles
// ("Try it Live"/"Upload Photo") are written for the wide mode-select cards and don't fit here.
const MODE_SHORT_LABEL: Record<TTryOnMode, string> = {
  [TRYON_MODE_MAP.LIVE]: 'Live',
  [TRYON_MODE_MAP.UPLOAD]: 'Photo',
};

// Right-side sidebar: the mode-toggle card + models heading stay fixed at the top (not part of any
// scroll region at all - they're plain siblings above it, not sticky elements sharing the scroll
// container), and only the preset model photos below scroll.
const TryOnSidebar = ({
  category,
  mode,
  onModeToggle,
  cameraVideoRef,
  cameraReady,
  previewImageUrl,
  onModelSelect,
  modelsDisabled = false,
}: ITryOnSidebarProps) => {
  return (
    // `min-h-0` lets this shrink below its content's natural height instead of pushing the
    // modal taller - required for the models list below to actually clip/scroll rather than
    // just growing.
    <div className="flex min-h-0 w-28 flex-1 flex-col gap-3 sm:w-32 xl:w-36">
      <div className="border-primary/10 bg-secondary-invert relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl border">
        {mode === TRYON_MODE_MAP.LIVE && cameraReady && (
          <video
            ref={cameraVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 size-full scale-x-[-1] object-cover blur-[2px]"
          />
        )}
        {mode === TRYON_MODE_MAP.UPLOAD && previewImageUrl && (
          <img
            src={previewImageUrl}
            alt="Model preview"
            className="absolute inset-0 size-full object-cover blur-sm"
          />
        )}
        <div className="bg-primary-invert/30 absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
          <div
            role="group"
            aria-label="Try-On mode"
            className="border-primary/10 bg-secondary-invert/90 flex w-full shrink-0 flex-col gap-0.5 rounded-xl border p-0.5 shadow-md backdrop-blur-md xl:flex-row"
          >
            {TRYON_MODE_OPTIONS.map((option) => {
              const active = option.mode === mode;

              return (
                <button
                  key={option.mode}
                  type="button"
                  aria-label={option.title}
                  aria-pressed={active}
                  onClick={() => {
                    onModeToggle(option.mode);
                  }}
                  className={`focus-visible:outline-blue-crayola-c flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-[10px] px-1.5 py-1.5 text-[11px] font-medium transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-1 ${
                    active
                      ? 'bg-sky-blue-burst shadow-secondary-btn text-white'
                      : 'text-secondary hover:bg-primary/5'
                  }`}
                >
                  <Icon icon={option.icon} className="size-3.5 shrink-0" />
                  {MODE_SHORT_LABEL[option.mode]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-primary/60 text-[11px] font-semibold tracking-wide uppercase">
          Models
        </span>
        <span aria-hidden className="bg-hr-line h-px flex-1" />
      </div>

      <TryOnModelList
        direction="vertical"
        category={category}
        mode={mode}
        previewImageUrl={previewImageUrl}
        onModelSelect={onModelSelect}
        disabled={modelsDisabled}
      />
    </div>
  );
};

export default TryOnSidebar;
