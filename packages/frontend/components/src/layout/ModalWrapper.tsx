import { Icon } from '@iconify/react';
import {
  type ComponentProps,
  type CSSProperties,
  type PointerEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  useId,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';

import { useDismiss } from '../lib/useDismiss.js';
import { useFocusTrap } from '../lib/useFocusTrap.js';
import { useIsClient } from '../lib/useIsClient.js';
import { useScrollLock } from '../lib/useScrollLock.js';
import type { IClassName } from '../types/component.js';
import { GradientText } from '../ui/index.js';
import { registerLayoutIcons } from './layout-icons.js';
import { ScrollableGradientContainer } from './ScrollableGradientContainer.js';

export interface IModalHeader {
  /** The title: it is the name of the dialog for assistive technology. */
  title?: string;
  /** A button that closes the dialog. */
  showCloseIcon?: boolean;
}

export interface IModalWrapper extends IClassName {
  isOpen: boolean;
  /** Called when the dialog asks to be closed: Escape, the close button, a press on the backdrop. */
  onClose: () => void;
  children: ReactNode;
  /** Attributes of the backdrop (the layer behind the dialog), e.g. `className`. */
  containerProps?: ComponentProps<'div'>;
  header?: IModalHeader;
  /** Pressing the backdrop closes the dialog. @default true */
  closeOnOutsideClick?: boolean;
  /** The style of the dialog box. */
  style?: CSSProperties;
  /**
   * A name for the dialog when it has no `header.title` ("Sign in"). Give one of the two: a dialog
   * that has no name is announced as just "dialog".
   */
  label?: string;
  /** The `id` of an element that names the dialog, when it is not the `header.title` or `label`. */
  labelledBy?: string;
  /** The `id` of the element that describes the dialog. */
  describedBy?: string;
  /** A dialog that interrupts to ask for a decision is an `alertdialog`. @default 'dialog' */
  role?: 'dialog' | 'alertdialog';
  /** The element that gets the focus when it opens. @default the first thing Tab stops on */
  initialFocus?: RefObject<HTMLElement | null>;
  /** What the close button is called, for assistive technology. @default 'Close' */
  closeLabel?: string;
}

/**
 * A dialog over the page, drawn in `document.body` over a backdrop.
 *
 * It behaves as a dialog has to: it is announced as one (`role="dialog"`, `aria-modal`, named by its
 * title or `label`), the keyboard stays inside it (Tab goes round), the focus goes into it when it
 * opens and back to what had it when it closes, the page behind does not scroll, and Escape closes it
 * (only the one that is on top when there are several). A press on the backdrop closes it too, unless
 * `closeOnOutsideClick` is false; a press that starts inside the dialog and ends on the backdrop (a
 * text that is selected by dragging) does not.
 */
export const ModalWrapper = ({
  isOpen,
  onClose,
  children,
  containerProps,
  className = '',
  header,
  closeOnOutsideClick = true,
  style,
  label,
  labelledBy,
  describedBy,
  role = 'dialog',
  initialFocus,
  closeLabel = 'Close',
}: IModalWrapper) => {
  registerLayoutIcons();

  const titleId = useId();
  const isClient = useIsClient();
  const isShown = isOpen && isClient;
  const pressedBackdropRef = useRef(false);

  const dialogRef = useFocusTrap<HTMLDivElement>({ enabled: isShown, initialFocus });

  useScrollLock(isShown);
  useDismiss(
    () => {
      onClose();
    },
    { enabled: isShown, outside: false },
  );

  if (!isShown) return null;

  const hasTitle = !!header?.title;
  const hasHeader = hasTitle || !!header?.showCloseIcon;

  const closeButton = (
    <button
      type="button"
      aria-label={closeLabel}
      className="group cursor-pointer p-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-crayola-c"
      onClick={onClose}
    >
      <Icon
        icon="lucide:x"
        className="text-tertiary group-hover:text-primary size-4 transition-all duration-300 group-hover:scale-110 motion-reduce:transition-none sm:size-5"
      />
    </button>
  );

  return createPortal(
    <div
      {...containerProps}
      onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
        // a press that starts on the backdrop itself, not one that started in the dialog
        pressedBackdropRef.current = event.target === event.currentTarget;
        containerProps?.onPointerDown?.(event);
      }}
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => {
        containerProps?.onClick?.(event);

        if (
          closeOnOutsideClick &&
          pressedBackdropRef.current &&
          event.target === event.currentTarget
        ) {
          onClose();
        }

        pressedBackdropRef.current = false;
      }}
      className={`bg-primary-invert/50 fixed inset-0 z-100 flex items-center justify-center p-8 backdrop-blur-xs ${
        containerProps?.className ?? ''
      }`}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-label={labelledBy || hasTitle ? undefined : label}
        aria-labelledby={labelledBy ?? (hasTitle ? titleId : undefined)}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`bg-primary-invert border-primary/20 relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-xl border shadow-lg outline-none ${className}`}
        style={style}
      >
        {hasHeader && (
          <div
            className={`bg-primary-invert z-20 flex max-h-16 items-center ${
              hasTitle
                ? 'border-b-primary/50 sticky inset-x-0 top-0 justify-between border-b px-6 py-4'
                : 'border-primary/20 shadow-primary/20 absolute top-0 right-0 justify-center rounded-bl-xl border-b border-l shadow-lg'
            }`}
          >
            {hasTitle && (
              <h2 id={titleId} className="flex-1 text-center text-lg font-semibold">
                <GradientText text={header.title ?? ''} type="silver" />
              </h2>
            )}
            {header.showCloseIcon && closeButton}
          </div>
        )}
        <ScrollableGradientContainer
          direction="vertical"
          containerClassName="flex-1"
          className="overscroll-contain p-4"
          gradientClassNames={{ top: 'h-8!', bottom: 'h-8!' }}
        >
          {children}
        </ScrollableGradientContainer>
      </div>
    </div>,
    document.body,
  );
};
