import { Icon } from '@iconify/react';

interface ITryOnTopControlsProps {
  compareProps: { disabled: boolean; onClick: () => void; active: boolean };
  resetProps: { disabled: boolean; onClick: () => void };
  downloadProps: { disabled: boolean; onClick: () => void };
  // Omitted where the browser can't fullscreen an arbitrary element (iPhone Safari) - the button
  // simply isn't rendered there rather than shown and dead.
  fullscreenProps?: { disabled: boolean; onClick: () => void; active: boolean };
}

interface IControlButtonProps {
  icon: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
  active?: boolean;
  // Only the compare toggle has a real on/off state - the other two are plain actions, so
  // `aria-pressed` must stay unset for them (a button with `aria-pressed={false}` reads as a
  // toggle to a screen reader, which reset/download are not).
  isToggle?: boolean;
}

// Floats over the live/photo canvas, so it can't borrow the app's own light/dark surface colors -
// the content underneath is arbitrary (a bright selfie, a dark room), which is why this sits on its
// own dark frosted glass with white icons instead, readable over anything and in either theme.
const ControlButton = ({
  icon,
  label,
  disabled,
  onClick,
  active = false,
  isToggle = false,
}: IControlButtonProps) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={isToggle ? active : undefined}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className={`flex size-9 cursor-pointer items-center justify-center rounded-full text-white transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 sm:size-10 ${
      active
        ? 'bg-sky-blue-burst shadow-secondary-btn'
        : 'hover:bg-white/20 disabled:hover:bg-transparent'
    }`}
  >
    <Icon icon={icon} className="size-4.5 sm:size-5" />
  </button>
);

const TryOnTopControls = ({
  compareProps,
  resetProps,
  downloadProps,
  fullscreenProps,
}: ITryOnTopControlsProps) => (
  <div
    role="toolbar"
    aria-label="Try-On actions"
    className="absolute top-3 right-3 z-5 flex items-center gap-0.5 rounded-full border border-white/15 bg-black/40 p-1 shadow-lg backdrop-blur-md sm:top-4 sm:right-4"
  >
    <ControlButton
      icon="iconamoon:compare-fill"
      // Stable name on purpose - the on/off state is carried by `aria-pressed`; swapping the label
      // too ("Hide ..." while pressed) would announce the same state twice, contradictorily.
      label="Compare before/after"
      active={compareProps.active}
      isToggle
      disabled={compareProps.disabled}
      onClick={compareProps.onClick}
    />
    <span aria-hidden className="h-4 w-px bg-white/20" />
    <ControlButton
      icon="solar:restart-linear"
      label="Reset applied makeup"
      disabled={resetProps.disabled}
      onClick={resetProps.onClick}
    />
    <ControlButton
      icon="solar:download-minimalistic-linear"
      label="Download snapshot"
      disabled={downloadProps.disabled}
      onClick={downloadProps.onClick}
    />
    {fullscreenProps && (
      <>
        <span aria-hidden className="h-4 w-px bg-white/20" />
        <ControlButton
          icon={
            fullscreenProps.active ? 'solar:quit-full-screen-linear' : 'solar:full-screen-linear'
          }
          // Stable name, same reasoning as the compare toggle above - `aria-pressed` carries state.
          label="Full screen"
          active={fullscreenProps.active}
          isToggle
          disabled={fullscreenProps.disabled}
          onClick={fullscreenProps.onClick}
        />
      </>
    )}
  </div>
);

export default TryOnTopControls;
