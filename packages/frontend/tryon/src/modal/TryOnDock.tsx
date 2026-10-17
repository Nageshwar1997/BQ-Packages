import { Icon } from '@iconify/react';
import { type ReactNode, useId, useState } from 'react';

interface ITryOnDockProps {
  // Hidden outright (not just collapsed) - TryOnModal passes this while comparing, since the dock
  // would otherwise sit on top of the compare slider's drag surface. Collapse state is kept.
  hidden?: boolean;
  // The shade currently applied - shown as a dot on the handle while collapsed, so a hidden dock
  // still says what's on the photo.
  appliedColor?: string | null;
  children: ReactNode;
}

// The bottom stack over the canvas (intensity slider, shade swatches, EYE pattern swatches). It
// takes a lot of the photo, so a handle on top collapses it - open by default, and it stays
// mounted when collapsed (just `inert` and zero-height) so nothing inside loses its state.
//
// The dock itself is click-through (`pointer-events-none`; only the handle and the content opt
// back in) so its soft scrim - there to keep the glass cards readable over a bright photo - never
// blocks anything but the controls.
const TryOnDock = ({ hidden = false, appliedColor = null, children }: ITryOnDockProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const contentId = useId();

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-3 flex flex-col items-center px-2 pt-10 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] ${hidden ? 'hidden' : ''}`}
    >
      <div
        aria-hidden
        className={`absolute inset-0 -z-10 bg-linear-to-t from-black/55 via-black/25 to-transparent transition-opacity duration-300 motion-reduce:transition-none ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
        className="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-black/40 py-1.5 pr-2.5 pl-3 text-xs font-medium text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
      >
        {!isOpen && appliedColor && (
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full border border-white/70"
            style={{ backgroundColor: appliedColor }}
          />
        )}
        Shades
        <Icon
          icon="solar:alt-arrow-down-linear"
          className={`size-3.5 transition-transform duration-300 motion-reduce:transition-none ${
            isOpen ? '' : 'rotate-180'
          }`}
        />
      </button>

      <div
        className={`grid w-full transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? 'pointer-events-auto grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div id={contentId} inert={!isOpen} className="min-h-0 overflow-hidden">
          <div className="flex flex-col items-center gap-2 pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default TryOnDock;
