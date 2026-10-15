import { useState, type VideoHTMLAttributes } from 'react';

import type { IClassName } from '../types/component.js';
import type { IMediaLabels, TMediaOption } from './labels.js';
import { type IMediaCarousel, MediaCarousel, type TPlayerProps } from './MediaCarousel.js';
import { MediaModal } from './MediaModal.js';

export interface IMediaCarouselWithModal
  extends IClassName, Pick<IMediaCarousel, 'gradientClassNames'> {
  media: readonly TMediaOption[];
  /** The attributes of the videos in the dialog (see `MediaModal`). */
  videoProps?: VideoHTMLAttributes<HTMLVideoElement>;
  labels?: Partial<IMediaLabels>;
  playerProps?: TPlayerProps;
}

/**
 * A row of thumbnails; choosing one opens it in a dialog (`MediaModal`) where the others can be
 * browsed. The dialog closes by itself when the item it was opened on is no longer there.
 */
export const MediaCarouselWithModal = ({
  media,
  videoProps,
  className = '',
  gradientClassNames,
  labels,
  playerProps,
}: IMediaCarouselWithModal) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Closed while rendering when its item is gone (the list got shorter), so it cannot come back by
  // itself when the list grows again.
  if (openIndex !== null && openIndex >= media.length) setOpenIndex(null);

  if (media.length === 0) return null;

  return (
    <div className={`max-w-full min-w-0 overflow-hidden rounded-md ${className}`}>
      <MediaCarousel
        media={media}
        selected={openIndex}
        onClick={setOpenIndex}
        gradientClassNames={gradientClassNames}
        listClassName="p-0"
        labels={labels}
        playerProps={playerProps}
      />

      <MediaModal
        media={media}
        selected={openIndex}
        isOpen={openIndex !== null}
        onClose={() => {
          setOpenIndex(null);
        }}
        videoProps={videoProps}
        labels={labels}
        playerProps={playerProps}
      />
    </div>
  );
};
