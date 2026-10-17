import { Button, GradientText } from '@beautinique/frontend-components';
import { IMAGE_MIMES } from '@beautinique/frontend-constants';
import type { TTryOnCategory } from '@beautinique/frontend-types';
import { Icon } from '@iconify/react';
import { type ChangeEvent, useMemo, useRef } from 'react';

import { getTryOnInstructions, TRYON_MODE_MAP } from '../constants/index.js';
import type { ITryOnError, TTryOnMode } from '../types/index.js';

interface ITryOnInstructions {
  mode: TTryOnMode;
  category: TTryOnCategory;
  onBack: () => void;
  // Live mode only - advances the flow straight to the 'tryon' step (the engine mounts there
  // and requests the camera).
  onStartLive: () => void;
  // Upload mode only - the picked file, handed back so the parent can run it through
  // `useTryOnUpload` and advance the flow to the 'tryon' step. The file input/click-trigger
  // itself has no reason to live outside this screen - nothing else opens it.
  onFileSelected: (file: File) => void;
  // Upload mode only - why the last photo was turned down (too big, not an image), told here when
  // the app did not take that over with `onUploadError`.
  uploadError?: ITryOnError | null;
  className?: string;
}

// Step 2 of the flow - shown after picking Live/Upload, before the engine ever mounts.
//
// Same scroll-outside/center-inside split as TryOnModeSelect (see its own comment) so a long tip
// list on a short screen scrolls instead of getting its top clipped.
const TryOnInstructions = ({
  mode,
  category,
  onStartLive,
  onFileSelected,
  onBack,
  uploadError = null,
  className = '',
}: ITryOnInstructions) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const instructions = useMemo(() => getTryOnInstructions(category, mode), [category, mode]);
  const isLive = mode === TRYON_MODE_MAP.LIVE;

  const handleChoosePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onFileSelected(file);
  };

  return (
    <div className={`h-full overflow-y-auto ${className}`}>
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center gap-5 p-5 text-center sm:p-8">
        <div className="flex flex-col items-center gap-3">
          <span className="bg-accent-duo shadow-secondary-btn flex size-14 shrink-0 items-center justify-center rounded-2xl sm:size-16">
            <Icon
              icon={isLive ? 'solar:camera-linear' : 'solar:gallery-add-linear'}
              className="size-7 text-white sm:size-8"
            />
          </span>
          <div className="flex flex-col gap-1">
            <GradientText
              type="accent"
              text="Tips for a great result"
              className="mx-auto text-xl font-semibold sm:text-2xl"
            />
            <p className="text-tertiary text-xs sm:text-sm">
              {isLive
                ? "We'll ask for camera access next - these tips help it find you quickly."
                : 'Pick a clear, front-facing photo - these tips make the biggest difference.'}
            </p>
          </div>
        </div>

        <ul
          className={`grid w-full gap-2.5 text-left ${instructions.length > 3 ? 'sm:grid-cols-2' : ''}`}
        >
          {instructions.map(({ icon, text }, index) => (
            <li
              key={text}
              className="border-primary/10 bg-secondary-invert flex items-start gap-3 rounded-xl border p-3"
            >
              <span className="bg-blue-crayola-c/10 text-blue-crayola-c flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Icon icon={icon} className="size-4.5" />
              </span>
              <span className="text-secondary pt-1 text-xs leading-5 sm:text-sm">
                <span className="sr-only">{`Tip ${String(index + 1)}: `}</span>
                {text}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex w-full items-center justify-center gap-3 pt-1">
          <Button
            pattern="secondary"
            content="Back"
            leftIcon={{ icon: 'solar:arrow-left-linear' }}
            buttonProps={{ onClick: onBack }}
          />
          <Button
            pattern="primary"
            content={isLive ? 'Start camera' : 'Choose photo'}
            rightIcon={{ icon: isLive ? 'solar:camera-linear' : 'solar:gallery-send-linear' }}
            buttonProps={{ onClick: isLive ? onStartLive : handleChoosePhoto }}
          />
        </div>

        {!isLive && uploadError && (
          // an alert: the photo was turned down, and nothing else on the screen says so
          <p
            role="alert"
            className="flex w-full items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left text-xs sm:text-sm"
          >
            <Icon
              icon="solar:danger-triangle-linear"
              className="mt-0.5 size-4.5 shrink-0 text-red-500"
            />
            <span className="text-secondary">
              <span className="text-primary block font-semibold">{uploadError.title}</span>
              {uploadError.description}
            </span>
          </p>
        )}

        {!isLive && (
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_MIMES.join(', ')}
            className="sr-only"
            onChange={handleFileChange}
          />
        )}
      </div>
    </div>
  );
};

export default TryOnInstructions;
