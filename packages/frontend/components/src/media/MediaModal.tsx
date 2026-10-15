import type { VideoHTMLAttributes } from 'react';

import { ModalWrapper } from '../layout/index.js';
import type { IClassName } from '../types/component.js';
import { type IMediaLabels, resolveLabels, type TMediaOption } from './labels.js';
import { MediaCarouselWithParentMedia } from './MediaCarouselWithParentMedia.js';
import type { TPlayerProps } from './MediaCarousel.js';

export interface IMediaModal extends IClassName {
  media: readonly TMediaOption[];
  isOpen: boolean;
  onClose: () => void;
  /** The item that is shown first. */
  selected?: number | null;
  /**
   * The attributes of the video. In the dialog a video plays by itself, muted, in a loop and with
   * controls (to unmute it, stop it and move in it), unless told otherwise.
   */
  videoProps?: VideoHTMLAttributes<HTMLVideoElement>;
  /** Adds a button on each thumbnail that calls this with its index. */
  handleRemove?: (index: number) => void;
  labels?: Partial<IMediaLabels>;
  playerProps?: TPlayerProps;
}

/**
 * The pictures and videos of a gallery in a dialog (`ModalWrapper`: Escape and the close button close
 * it, the focus is kept inside and goes back). Without any media it shows nothing. The `className`
 * is the one of the backdrop.
 */
export const MediaModal = ({
  media,
  isOpen,
  onClose,
  selected,
  className = '',
  videoProps,
  handleRemove,
  labels,
  playerProps,
}: IMediaModal) => {
  const text = resolveLabels(labels);

  return (
    <ModalWrapper
      className="max-w-xl"
      isOpen={isOpen && media.length > 0}
      onClose={onClose}
      containerProps={{ className }}
      header={{ showCloseIcon: true }}
      closeLabel={text.close}
      label={text.gallery}
    >
      <MediaCarouselWithParentMedia
        media={media}
        selected={selected}
        handleRemove={handleRemove}
        labels={labels}
        playerProps={playerProps}
        videoProps={{
          ...videoProps,
          autoPlay: videoProps?.autoPlay ?? true,
          muted: videoProps?.muted ?? true,
          loop: videoProps?.loop ?? true,
          controls: videoProps?.controls ?? true,
          className: `object-contain! bg-primary/10 backdrop-blur-xs rounded-lg ${videoProps?.className ?? ''}`,
        }}
      />
    </ModalWrapper>
  );
};
