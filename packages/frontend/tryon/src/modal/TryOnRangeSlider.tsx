interface ITryOnRangeSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  // The active shade's hex - the track fills from transparent to this color, so the slider
  // itself reads as "how much of this shade" rather than a generic progress bar. Mirrors the
  // reference implementation's range slider (`virtual-tryon/component/CosmeticTryOn.tsx`).
  color: string;
  disabled?: boolean;
  onChange: (value: number) => void;
  className?: string;
}

// Shade-intensity control - drives the engine's `state.range` (rendered as canvas alpha, see
// e.g. LipEngineBase.applyEffect), already fully wired end-to-end in the engine layer; this is
// just the UI piece. Category-agnostic despite living in `tryons/` - any category with its own
// intensity bounds can reuse it as-is. Sits on its own dark frosted glass (same as the rest of
// the dock it lives in) since it floats over arbitrary camera/photo content.
const TryOnRangeSlider = ({
  value,
  min,
  max,
  step = 0.01,
  color,
  disabled = false,
  onChange,
  className = '',
}: ITryOnRangeSliderProps) => {
  const span = max - min;
  // Shown to the shopper as a plain 0-100 reading, however the engine's own bounds are tuned per
  // finish (e.g. FOUNDATION's 0.2-0.8 vs. GLOSS's 0.3-1) - the raw alpha means nothing to them.
  const percent = span > 0 ? Math.round(((value - min) / span) * 100) : 0;

  return (
    <div
      className={`mx-auto flex w-full max-w-sm flex-col gap-1.5 rounded-2xl border border-white/10 bg-black/35 px-4 py-2.5 shadow-lg backdrop-blur-md transition-opacity duration-300 ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between text-[11px] font-medium text-white sm:text-xs">
        <span className="flex items-center gap-1.5 text-white/80">
          <span
            aria-hidden
            className="size-2.5 rounded-full border border-white/70"
            style={{ backgroundColor: color }}
          />
          Intensity
        </span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <input
        type="range"
        aria-label="Shade intensity"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        className="h-2.5 w-full cursor-pointer appearance-none rounded-full border border-white/30 transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
        style={{ background: `linear-gradient(to right, ${color}00, ${color})` }}
      />
    </div>
  );
};

export default TryOnRangeSlider;
