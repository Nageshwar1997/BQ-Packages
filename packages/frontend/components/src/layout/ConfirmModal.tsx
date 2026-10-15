import { Icon } from '@iconify/react';
import { type ReactNode, useId } from 'react';

import type { ITextButton } from '../types/component.js';
import { Button, GradientText } from '../ui/index.js';
import { registerLayoutIcons } from './layout-icons.js';
import { type IModalWrapper, ModalWrapper } from './ModalWrapper.js';

type TConfirmButton = Omit<ITextButton, 'pattern'>;

interface IConfirmButtons {
  /** The button on the left: it closes the dialog after its `onClick`. Usually the way out ("Cancel"). */
  left?: TConfirmButton;
  /**
   * The button on the right, the main one. With an `onClick` the dialog stays open (the app closes it
   * when what was asked is done); without one it closes the dialog.
   */
  right?: TConfirmButton;
}

interface ICustomConfirmModal {
  /** Your own content, in the dialog. Give the dialog a name in `modalProps.label`. */
  type: 'custom';
  children: ReactNode;
  title?: never;
  description?: never;
  buttons?: IConfirmButtons;
}

interface IDefaultConfirmModal {
  type: 'success' | 'error' | 'warning' | 'default';
  children?: never;
  title: string;
  description?: string;
  buttons: IConfirmButtons;
}

export type TConfirmModal = (ICustomConfirmModal | IDefaultConfirmModal) & {
  /** `isOpen` and `onClose` are the app's; the rest is passed to the dialog (`className`, `label`, ...). */
  modalProps: Omit<IModalWrapper, 'children' | 'closeOnOutsideClick' | 'role'>;
};

const TYPE_LOOK = {
  success: { icon: 'solar:check-circle-linear', rgb: 'var(--primary-green-rgb)' },
  error: { icon: 'solar:danger-triangle-linear', rgb: 'var(--primary-red-rgb)' },
  warning: { icon: 'solar:danger-triangle-linear', rgb: 'var(--primary-yellow-rgb)' },
  default: { icon: 'solar:info-circle-outline', rgb: 'var(--primary-rgb)' },
} as const;

/**
 * A dialog that asks for a decision ("Delete this category?") or tells how something went: an
 * icon and colour for the kind of message (`success`, `error`, `warning`, `default`), a title, a
 * description and up to two buttons. `type="custom"` shows content of your own instead.
 *
 * It is an `alertdialog`, named by the title and described by the description, and the focus starts on
 * the first button (the way out). A press on the backdrop does not close it: a decision should not be
 * made by a stray click. Escape and the close button of `modalProps.header` do.
 */
export const ConfirmModal = ({
  type,
  buttons,
  children,
  description,
  modalProps,
  title,
}: TConfirmModal) => {
  registerLayoutIcons();

  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;
  const look = TYPE_LOOK[type === 'custom' ? 'default' : type];

  return (
    <ModalWrapper
      {...modalProps}
      role="alertdialog"
      closeOnOutsideClick={false}
      labelledBy={type === 'custom' ? modalProps.labelledBy : titleId}
      describedBy={type === 'custom' || !description ? modalProps.describedBy : descriptionId}
      className={`max-w-sm border-2 ${modalProps.className ?? ''}`}
      containerProps={{
        ...modalProps.containerProps,
        className: `p-6! ${modalProps.containerProps?.className ?? ''}`,
      }}
      style={{
        ...modalProps.style,
        borderColor: `rgba(${look.rgb}, 0.4)`,
        boxShadow: `0 10px 10px 0px rgba(${look.rgb}, 0.1)`,
      }}
    >
      <div className="grid w-full place-items-center gap-6">
        {type === 'custom' ? (
          children
        ) : (
          <>
            <div
              className="grid size-10 shrink-0 place-items-center rounded-full border p-2 md:size-12 lg:size-14"
              style={{
                borderColor: `rgba(${look.rgb}, 0.8)`,
                background: `radial-gradient(circle, rgba(${look.rgb}, 0.25) 25%, rgba(${look.rgb}, 0.5) 50%, rgba(${look.rgb}, 0.75) 75%, rgba(${look.rgb}, 1) 100%)`,
                boxShadow: `0 0 0 1px rgba(${look.rgb}, 0.08), 0 0 12px rgba(${look.rgb}, 0.18), 0 8px 24px rgba(${look.rgb}, 0.22)`,
              }}
            >
              <Icon icon={look.icon} className="size-full" />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 id={titleId}>
                <GradientText
                  text={title}
                  type="silver"
                  className="block font-semibold text-shadow-lg md:text-lg lg:text-xl"
                />
              </h2>
              {description && (
                <p id={descriptionId} className="text-tertiary text-xs font-light lg:text-sm">
                  {description}
                </p>
              )}
            </div>
          </>
        )}
        {buttons && (
          <div className="flex w-full items-center justify-center gap-4">
            {buttons.left && (
              <Button
                pattern="secondary"
                {...buttons.left}
                className={`max-h-10 rounded-md! ${buttons.left.className ?? ''}`}
                buttonProps={{
                  ...buttons.left.buttonProps,
                  onClick: (event) => {
                    buttons.left?.buttonProps?.onClick?.(event);
                    modalProps.onClose();
                  },
                }}
              />
            )}
            {buttons.right && (
              <Button
                pattern="primary"
                {...buttons.right}
                className={`max-h-10 rounded-md! ${buttons.right.className ?? ''}`}
                buttonProps={{
                  ...buttons.right.buttonProps,
                  onClick: (event) => {
                    if (buttons.right?.buttonProps?.onClick)
                      buttons.right.buttonProps.onClick(event);
                    else modalProps.onClose();
                  },
                }}
              />
            )}
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};
