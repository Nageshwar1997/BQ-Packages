import { ScrollableGradientContainer } from '@beautinique/frontend-components';
import { Icon } from '@iconify/react';

import type { IShade } from '../types/index.js';

interface ITryOnShadeSwatchesProps {
  shades: IShade[];
  appliedColor: string | null;
  // `null` means "deselect" - clicking the already-active shade again toggles it off.
  onSelect: (hexColor: string | null) => void;
  // Picking a shade before the engine can actually render it is a no-op at best - disable the
  // whole strip until the stage reports ready (see TryOnModal's `isTryOnReady`).
  disabled?: boolean;
  className?: string;
}

// Bottom-of-canvas shade strip - mirrors the reference's Variants.tsx (circular swatch, active
// state = ring + check icon), driven by real product shade data, not a color-wheel input. Sits on
// the same dark frosted glass as the rest of the dock (see TryOnModal) since it floats over
// arbitrary camera/photo content, and names the applied shade up top so the shopper isn't left
// squinting at a tiny per-swatch caption to know what they're wearing.
const TryOnShadeSwatches = ({
  shades,
  appliedColor,
  onSelect,
  disabled = false,
  className = '',
}: ITryOnShadeSwatchesProps) => {
  if (!shades.length) return null;

  const appliedShade = shades.find((shade) => shade.hexColor === appliedColor);

  return (
    <div
      className={`mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-black/35 shadow-lg backdrop-blur-md transition-opacity duration-300 ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-2.5 text-[11px] sm:text-xs">
        <span className="font-medium text-white/80">
          Shades <span className="text-white/50">({shades.length})</span>
        </span>
        <span className="truncate font-semibold text-white" aria-live="polite">
          {appliedShade?.name ?? 'Tap a shade to apply'}
        </span>
      </div>
      {/* The row is at the bottom of a rounded card: its container (it clips what is in it) gets the
          rounded bottom corners of the card, or the fades on its two edges poke out of them. */}
      <ScrollableGradientContainer
        direction="horizontal"
        label="Shades"
        containerClassName="rounded-b-2xl"
        className="px-4 pt-2.5 pb-2.5 [&>div]:gap-3"
        gradientClassNames={{
          left: 'from-black/60! w-8!',
          right: 'from-black/60! w-8!',
        }}
      >
        {shades.map((shade) => {
          const active = shade.hexColor === appliedColor;

          return (
            <div key={shade.hexColor} className="flex shrink-0 flex-col items-center gap-1.5">
              <button
                type="button"
                aria-label={active ? `Remove ${shade.name}` : `Apply ${shade.name}`}
                disabled={disabled}
                onClick={() => {
                  onSelect(active ? null : shade.hexColor);
                }}
                className={`group flex size-10 cursor-pointer items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed sm:size-11 ${
                  active
                    ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black/60'
                    : 'border-2 border-white/30 hover:scale-105 hover:border-white/70'
                }`}
                style={{ backgroundColor: shade.hexColor }}
              >
                {active ? (
                  <>
                    {/* Selected: filled check, swaps to a "remove" icon on hover. */}
                    <Icon
                      icon="solar:check-circle-bold"
                      className="size-5 text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.6)] group-hover:hidden"
                    />
                    <Icon
                      icon="solar:close-circle-bold"
                      className="hidden size-5 text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.6)] group-hover:block"
                    />
                  </>
                ) : (
                  // Not selected: an outline check preview, only on hover.
                  <Icon
                    icon="solar:check-circle-linear"
                    className="hidden size-5 text-white/90 drop-shadow-[0_0_3px_rgba(0,0,0,0.6)] group-hover:block"
                  />
                )}
              </button>
              <p
                className={`max-w-14 truncate text-center text-[10px] ${active ? 'font-semibold text-white' : 'text-white/60'}`}
              >
                {shade.name}
              </p>
            </div>
          );
        })}
      </ScrollableGradientContainer>
    </div>
  );
};

export default TryOnShadeSwatches;
