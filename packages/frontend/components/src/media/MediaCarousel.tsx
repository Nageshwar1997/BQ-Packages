import { Icon } from '@iconify/react';
import { useEffect, useRef } from 'react';

import { type IScrollableGradientContainer, ScrollableGradientContainer } from '../layout/index.js';
import type { IClassName } from '../types/component.js';
import { type IMediaLabels, resolveLabels, type TMediaOption } from './labels.js';
import { registerMediaIcons } from './media-icons.js';
import { type IVideoPlayer, VideoPlayer } from './VideoPlayer.js';

/** What the media components give on to the video players they draw. */
export type TPlayerProps = Pick<IVideoPlayer, 'getPoster' | 'onStreamError' | 'placeholder'>;

export interface IMediaCarousel
  extends IClassName, Pick<IScrollableGradientContainer, 'gradientClassNames'> {
  media: readonly TMediaOption[];
  /** The thumbnail that is marked as the current one, and scrolled into view. */
  selected?: number | null;
  onClick: (index: number) => void;
  /** Adds a button on each thumbnail that calls this with its index. */
  handleRemove?: (index: number) => void;
  /**
   * Marks the thumbnails that have a problem (a red border), by place: `[false, true]` marks the
   * second one.
   */
  invalid?: readonly (boolean | undefined)[];
  /** The class of the row of thumbnails (the space around them). @default 'p-2' */
  listClassName?: string;
  labels?: Partial<IMediaLabels>;
  playerProps?: TPlayerProps;
}

// The same address twice is allowed: the second one is `url#1`. A key made of the position would
// make every thumbnail after a removed one start again.
const keysOf = (media: readonly TMediaOption[]) => {
  const seen = new Map<string, number>();

  return media.map(({ url }) => {
    const count = seen.get(url) ?? 0;

    seen.set(url, count + 1);

    return `${url}#${String(count)}`;
  });
};

/**
 * A row of thumbnails of pictures and videos to choose from. Each thumbnail is a button (named
 * "Show image 2 of 5") and the current one is marked with `aria-current`. When the current one
 * changes the row scrolls to bring it to the middle. A video shows its poster with a play mark.
 */
export const MediaCarousel = ({
  className = '',
  media,
  selected,
  onClick,
  handleRemove,
  gradientClassNames,
  invalid,
  listClassName = 'p-2',
  labels,
  playerProps,
}: IMediaCarousel) => {
  registerMediaIcons();

  const text = resolveLabels(labels);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller || selected === null || selected === undefined) return;

    const thumbnail = scroller.querySelector<HTMLElement>(
      `[data-media-index="${String(selected)}"]`,
    );

    if (!thumbnail) return;

    // Only the row is moved (not the page, as `scrollIntoView` would do), and the row's own
    // `scroll-behavior` decides if it is smooth.
    scroller.scrollLeft = thumbnail.offsetLeft - (scroller.clientWidth - thumbnail.offsetWidth) / 2;
  }, [selected]);

  if (media.length === 0) return null;

  const keys = keysOf(media);

  return (
    <ScrollableGradientContainer
      direction="horizontal"
      label={text.thumbnails}
      scrollerRef={scrollerRef}
      className={`w-full [&>div]:justify-start ${className}`}
      gradientClassNames={gradientClassNames}
    >
      <ul className={`media-carousel flex items-center gap-2 ${listClassName}`}>
        {media.map((item, index) => {
          const isSelected = index === selected;

          return (
            <li
              key={keys[index]}
              data-media-index={index}
              data-invalid={invalid?.at(index) ? '' : undefined}
              className={`relative size-14 shrink-0 overflow-hidden rounded-md border shadow-xs transition-colors duration-300 hover:opacity-100 md:size-16 lg:size-20 data-invalid:border-red-c! ${
                isSelected ? 'border-tertiary opacity-100' : 'border-primary/30 opacity-90'
              }`}
            >
              <button
                type="button"
                aria-label={text.select(item, index, media.length)}
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => {
                  onClick(index);
                }}
                className="group relative block size-full cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-crayola-c"
              >
                {item.type === 'video' ? (
                  <>
                    {!isSelected && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-1 grid place-items-center bg-black/50"
                      >
                        <Icon
                          icon="solar:play-linear"
                          className="text-white opacity-90 group-hover:opacity-100"
                        />
                      </span>
                    )}
                    <VideoPlayer
                      showPosterOnly
                      videoProps={{ src: item.url, autoPlay: false }}
                      className="aspect-square"
                      {...playerProps}
                    />
                  </>
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    className="aspect-square size-full object-cover"
                  />
                )}
              </button>

              {handleRemove && (
                <button
                  type="button"
                  aria-label={text.remove(item, index)}
                  className="group absolute top-0 right-0 z-2 grid size-6 cursor-pointer place-items-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-crayola-c"
                  onClick={() => {
                    handleRemove(index);
                  }}
                >
                  <span className="bg-tertiary/80 group-hover:bg-tertiary grid size-4 place-items-center rounded-full">
                    <Icon icon="lucide:x" className="text-primary-invert size-full shrink-0" />
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </ScrollableGradientContainer>
  );
};
