import { Icon } from '@iconify/react';
import { type KeyboardEvent, useState, type VideoHTMLAttributes } from 'react';

import type { IClassName } from '../types/component.js';
import { Divider } from '../ui/index.js';
import { type IMediaLabels, resolveLabels, type TMediaOption } from './labels.js';
import { MediaCarousel, type TPlayerProps } from './MediaCarousel.js';
import { registerMediaIcons } from './media-icons.js';
import { VideoPlayer } from './VideoPlayer.js';

export interface IMediaCarouselWithParent extends IClassName {
  media: readonly TMediaOption[];
  /**
   * The item to show. It is only the first one: the carousel goes on by itself when the person
   * chooses another, and follows this again whenever it changes.
   */
  selected?: number | null;
  /** Previous and next buttons with a counter, when there is more than one item. @default true */
  needButtonControls?: boolean;
  /** The attributes of the video when the item shown is one (`src` is the item's). */
  videoProps?: VideoHTMLAttributes<HTMLVideoElement>;
  /** Adds a button on each thumbnail that calls this with its index. */
  handleRemove?: (index: number) => void;
  labels?: Partial<IMediaLabels>;
  playerProps?: TPlayerProps;
}

const ChevronButton = ({
  onClick,
  label,
  className = '',
}: { onClick: () => void; label: string } & IClassName) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className={`border-primary/50 bg-primary-invert/50 cursor-pointer rounded-md border p-1.25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-crayola-c ${className}`}
  >
    <Icon icon="solar:alt-arrow-left-linear" className="text-primary" />
  </button>
);

// The keys that would do something else in these (a video with controls seeks with the arrows).
const isTypingTarget = (target: EventTarget) =>
  target instanceof HTMLVideoElement ||
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLElement && target.isContentEditable);

/**
 * The picture (or video) that is chosen, big, with the thumbnails of all of them under it. The
 * previous and next buttons go round (after the last one comes the first). With the focus anywhere in
 * it the left and right arrow keys do the same, and the counter between the buttons is read out
 * when it changes.
 *
 * A removed item that was the last one moves the carousel to the new last one.
 */
export const MediaCarouselWithParentMedia = ({
  className = '',
  media,
  selected,
  needButtonControls = true,
  videoProps,
  handleRemove,
  labels,
  playerProps,
}: IMediaCarouselWithParent) => {
  registerMediaIcons();

  const text = resolveLabels(labels);
  const [current, setCurrent] = useState(selected ?? 0);
  const [previousSelected, setPreviousSelected] = useState(selected);

  // The parent chose another item: follow it (set while rendering, so there is no frame with the old one).
  if (selected !== previousSelected) {
    setPreviousSelected(selected);

    if (selected !== null && selected !== undefined) setCurrent(selected);
  }

  const count = media.length;
  const index = Math.min(current, count - 1);
  const item = media.at(index);

  if (!item) return null;

  const hasControls = needButtonControls && count > 1;
  const go = (step: 1 | -1) => {
    // from the state as it is now, not from the one of the render: two presses in a row both count
    setCurrent((value) => (Math.min(value, count - 1) + step + count) % count);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!hasControls || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (isTypingTarget(event.target)) return;

    event.preventDefault();
    go(event.key === 'ArrowLeft' ? -1 : 1);
  };

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={text.gallery}
      onKeyDown={handleKeyDown}
      className={`bg-primary-invert flex w-full flex-col gap-4 overflow-hidden rounded-lg ${className}`}
    >
      <div className="relative flex h-100 items-center justify-center lg:h-105 xl:h-125">
        <div className="flex h-full w-full items-center justify-center rounded-lg">
          {item.type === 'video' ? (
            <VideoPlayer
              key={item.url}
              videoProps={{
                'aria-label': text.preview(item, index, count),
                ...videoProps,
                src: item.url,
              }}
              className="mx-auto flex max-h-full items-center justify-center"
              {...playerProps}
            />
          ) : (
            <img
              src={item.url}
              alt={text.preview(item, index, count)}
              className="mx-auto h-full max-h-full w-full object-contain"
            />
          )}
        </div>

        {hasControls && (
          <div className="absolute bottom-0 flex w-full items-center justify-center gap-5 py-2 text-center text-sm">
            <ChevronButton
              label={text.previous}
              onClick={() => {
                go(-1);
              }}
            />
            <span
              aria-live="polite"
              aria-atomic="true"
              className="border-primary/50 bg-primary-invert/50 text-primary min-h-full w-24 content-center rounded-md border px-4 py-2 leading-none"
            >
              {text.counter(index, count)}
            </span>
            <ChevronButton
              label={text.next}
              onClick={() => {
                go(1);
              }}
              className="[&>svg]:rotate-180"
            />
          </div>
        )}
      </div>

      {count > 1 && (
        <>
          <Divider />
          <MediaCarousel
            media={media}
            selected={index}
            onClick={setCurrent}
            handleRemove={handleRemove}
            labels={labels}
            playerProps={playerProps}
          />
        </>
      )}
    </div>
  );
};
