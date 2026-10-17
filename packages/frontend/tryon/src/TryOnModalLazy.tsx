import { LoadingRings, ModalWrapper } from '@beautinique/frontend-components';
import { lazy, Suspense, useState } from 'react';

import type { ITryOnModalProps } from './modal/TryOnModal.js';
import { TRYON_DIALOG_CLASS_NAME, TRYON_DIALOG_CONTAINER_PROPS } from './tryOnDialog.js';

// The heavy file of the package (the engines, MediaPipe) is loaded by a dynamic import of its own
// entry (`@beautinique/frontend-tryon/modal`): a bundler of the app puts it in a chunk of its own, that
// is only fetched when the modal is first opened.
const LoadedTryOnModal = lazy(() =>
  import('./modal/index.js').then(({ TryOnModal }) => ({ default: TryOnModal })),
);

/**
 * The try-on in a modal, in the same props as `@beautinique/frontend-tryon/modal`, but it costs the
 * page nothing until the modal is first opened: this is a few lines, and the engines are loaded then
 * (the modal shows a loading dialog for the moment it takes). Once opened it stays mounted, as the
 * modal of the `/modal` entry does.
 */
export const TryOnModal = (props: ITryOnModalProps) => {
  const { isOpen, onClose } = props;
  const [hasOpened, setHasOpened] = useState(isOpen);

  if (isOpen && !hasOpened) {
    setHasOpened(true);
  }

  if (!hasOpened) {
    return null;
  }

  return (
    <Suspense
      fallback={
        // The same size as the modal that is coming (see `tryOnDialog.ts`), so the dialog does not
        // jump from a small one to a full one when the engines arrive.
        <ModalWrapper
          isOpen={isOpen}
          onClose={onClose}
          header={{ title: 'Try-On', showCloseIcon: true }}
          containerProps={TRYON_DIALOG_CONTAINER_PROPS}
          className={TRYON_DIALOG_CLASS_NAME}
        >
          <div className="flex h-full min-h-60 w-full items-center justify-center">
            <LoadingRings text="Loading Try-On" />
          </div>
        </ModalWrapper>
      }
    >
      <LoadedTryOnModal {...props} />
    </Suspense>
  );
};
