import { Icon } from '@iconify/react';

interface ITryOnOverlayProps {
  icon: string;
  title: string;
  description: string;
  // Only meaningful for an actual error (not the plain loading/face-guide cases - there's
  // nothing to retry mid-load, and the face guide already resolves itself the moment the user
  // repositions) - see TryOnModal's `handleRetry`.
  action?: { label: string; onClick: () => void };
}

// One L-shaped bracket, positioned per corner by the `position` classes passed in - four of
// these (see below) read as a single scanner/viewfinder frame without needing an SVG sized to
// this component's own (variable, depends on the canvas panel) box.
const FrameCorner = ({ position, border }: { position: string; border: string }) => (
  <div className={`absolute size-8 sm:size-10 ${position} ${border}`} />
);

// The one overlay for every "can't interact with the canvas right now" reason - camera
// permission/photo-processing loading, a load error, and the live face-detection guide (out of
// frame / not clearly visible). These used to be two different designs (a spinner-based
// ApiStatus wrapper for loading/error, this corner-bracket frame just for the face guide); now
// every caller gets the same look, driven entirely by the icon/title/description passed in. For
// the face-guide case the corner-bracket frame doubles as the instruction itself (this is the
// area your face should be in); for loading/error it's just the consistent frame the message
// sits inside. Content sits on a dimmed, softly blurred scrim either way, so both frame and text
// stay readable over any live video/photo underneath, regardless of that content's own brightness
// or the app's own light/dark theme. The frame breathes (a slow pulse) while the overlay is
// waiting on something that resolves by itself - loading, or "move into frame" - and goes still,
// tinted red, for an actual error that needs the shopper's own action (the Retry button).
const TryOnOverlay = ({ icon, title, description, action }: ITryOnOverlayProps) => {
  const isError = !!action;
  const cornerColor = isError ? 'border-red-300/90' : 'border-white/85';

  return (
    <div
      // A screen-reader user has no other way to learn this appeared - it's a canvas-driven
      // overlay, not a focus change or a navigation, so nothing else would announce it. `alert`
      // (an actual error, `action` set) is the more urgent, `status` (loading, or the live
      // face-guide - out of frame/not clear/turned) the calmer one; both are `aria-live` roles
      // under the hood, so either way this doesn't need an explicit `aria-live` attribute too.
      role={isError ? 'alert' : 'status'}
      className="absolute inset-0 z-2 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] sm:p-6"
    >
      <div
        className={`relative aspect-3/4 h-full max-h-80 max-w-full ${isError ? '' : 'motion-safe:animate-pulse'}`}
      >
        <FrameCorner
          position="top-0 left-0 rounded-tl-2xl"
          border={`border-t-3 border-l-3 ${cornerColor}`}
        />
        <FrameCorner
          position="top-0 right-0 rounded-tr-2xl"
          border={`border-t-3 border-r-3 ${cornerColor}`}
        />
        <FrameCorner
          position="bottom-0 left-0 rounded-bl-2xl"
          border={`border-b-3 border-l-3 ${cornerColor}`}
        />
        <FrameCorner
          position="bottom-0 right-0 rounded-br-2xl"
          border={`border-b-3 border-r-3 ${cornerColor}`}
        />
      </div>

      {/* Sits *over* the (pulsing) frame instead of inside it, so the text itself never pulses -
          only the brackets do. Its own box matches the frame's so it stays centered in it. */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div className="flex max-w-60 flex-col items-center gap-2 text-center">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-full p-2.5 ring-1 backdrop-blur-md sm:size-12 ${
              isError ? 'bg-red-500/25 ring-red-300/40' : 'bg-white/15 ring-white/25'
            }`}
          >
            <Icon icon={icon} className="size-full text-white" />
          </div>
          <p className="text-sm font-semibold text-white first-letter:capitalize sm:text-base">
            {title}
          </p>
          <p className="text-xs leading-5 text-white/75 sm:text-sm sm:leading-6">{description}</p>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="bg-sky-blue-burst shadow-secondary-btn mt-1 flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold text-white transition-all duration-300 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
            >
              <Icon icon="solar:refresh-linear" className="size-3.5" />
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TryOnOverlay;
