import { GradientText } from '@beautinique/frontend-components';
import { Icon } from '@iconify/react';
import { type ReactNode, useEffect } from 'react';

interface ITryOnBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

// Mobile-only (see the outer `lg:hidden` - large screens keep the always-visible sidebar as-is,
// see TryOnSidebar.tsx) stand-in for the sidebar's mode-toggle/model-list once the screen's too
// narrow for one. Both the backdrop and the sheet itself stay mounted at all times, just
// faded/translated out when closed, so the slide-down-on-close transition actually plays instead
// of the sheet just disappearing.
//
// Because it stays mounted, the closed sheet is marked `inert` - without it the (visually
// off-screen) model buttons would still be reachable by Tab and announced by screen readers.
const TryOnBottomSheet = ({ isOpen, onClose, title, children }: ITryOnBottomSheetProps) => {
  // Escape closes it - only listened for while open, so a closed sheet never swallows the key
  // (the surrounding ModalWrapper uses Escape to close the whole try-on).
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  return (
    <div className="lg:hidden">
      <div
        aria-hidden
        onClick={onClose}
        className={`bg-primary-invert/60 fixed inset-0 z-40 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-label={title}
        aria-modal={isOpen}
        inert={!isOpen}
        className={`bg-primary-invert border-primary/10 fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] overflow-y-auto rounded-t-3xl border-t px-4 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        }`}
      >
        {/* Drag-handle affordance - purely visual, this sheet isn't actually draggable. */}
        <div aria-hidden className="bg-primary/20 mx-auto mb-3 h-1 w-10 rounded-full" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-accent-duo shadow-secondary-btn flex size-8 shrink-0 items-center justify-center rounded-xl">
              <Icon icon="solar:gallery-linear" className="size-4.5 text-white" />
            </span>
            <GradientText type="silver" text={title} className="text-base font-semibold" />
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="bg-primary/5 text-tertiary hover:bg-primary/10 hover:text-primary focus-visible:outline-blue-crayola-c flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Icon icon="lucide:x" className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default TryOnBottomSheet;
