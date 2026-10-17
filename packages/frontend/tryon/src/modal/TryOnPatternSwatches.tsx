import { ScrollableGradientContainer } from '@beautinique/frontend-components';
import { Icon } from '@iconify/react';

import { resolveTryOnAssetUrl } from '../constants/assets.js';
import type { IEyePatternOption } from '../types/eye.js';
import { useTryOnAssets } from './TryOnAssetsContext.js';

interface ITryOnPatternSwatchesProps {
  patterns: IEyePatternOption[];
  appliedPattern: string | null;
  onSelect: (patternId: string) => void;
  // Same reasoning as TryOnShadeSwatches's identical prop - picking a pattern before the engine
  // can actually render it is a no-op at best.
  disabled?: boolean;
  className?: string;
}

// EYE-only row, shown alongside TryOnShadeSwatches for finishes that have a `pattern` dimension
// (see docs/tryons/EYE-PLAN.md) - same swatch-strip shape and frosted-glass card as the shade
// picker, but each option is a preview thumbnail image (the style itself) rather than a flat color
// circle, since "which pattern" isn't something a color swatch can show. No deselect-to-null here
// (unlike shade swatches) - a pattern always has *some* value once a pattern-bearing finish is
// picked (see EYELINER_DEFAULT_PATTERN), there's no "no pattern" state to toggle back to.
const TryOnPatternSwatches = ({
  patterns,
  appliedPattern,
  onSelect,
  disabled = false,
  className = '',
}: ITryOnPatternSwatchesProps) => {
  const assets = useTryOnAssets();

  if (!patterns.length) return null;

  const appliedLabel = patterns.find((option) => option.id === appliedPattern)?.label;

  return (
    <div
      className={`mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-black/35 shadow-lg backdrop-blur-md transition-opacity duration-300 ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-2.5 text-[11px] sm:text-xs">
        <span className="font-medium text-white/80">
          Styles <span className="text-white/50">({patterns.length})</span>
        </span>
        <span className="truncate font-semibold text-white" aria-live="polite">
          {appliedLabel ?? 'Pick a style'}
        </span>
      </div>
      <ScrollableGradientContainer
        direction="horizontal"
        label="Styles"
        className="px-4 pt-2.5 pb-2.5 [&>div]:gap-3"
        gradientClassNames={{
          left: 'from-black/60! w-8!',
          right: 'from-black/60! w-8!',
        }}
      >
        {patterns.map((option) => {
          const active = option.id === appliedPattern;

          return (
            <div key={option.id} className="flex shrink-0 flex-col items-center gap-1.5">
              <button
                type="button"
                aria-label={`Apply ${option.label} pattern`}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => {
                  onSelect(option.id);
                }}
                className={`group relative flex size-11 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed sm:size-12 ${
                  active
                    ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black/60'
                    : 'border-2 border-white/30 hover:scale-105 hover:border-white/70'
                }`}
              >
                <img
                  src={resolveTryOnAssetUrl(option.image, assets)}
                  alt={option.label}
                  className="size-full object-cover"
                />
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Icon
                      icon="solar:check-circle-bold"
                      className="size-5 text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.6)]"
                    />
                  </span>
                )}
              </button>
              <p
                className={`max-w-14 truncate text-center text-[10px] ${active ? 'font-semibold text-white' : 'text-white/60'}`}
              >
                {option.label}
              </p>
            </div>
          );
        })}
      </ScrollableGradientContainer>
    </div>
  );
};

export default TryOnPatternSwatches;
