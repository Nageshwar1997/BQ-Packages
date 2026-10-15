import { Icon } from '@iconify/react';
import { type FocusEvent, type PointerEvent, useEffect, useState } from 'react';

import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion.js';
import type { IClassName } from '../types/component.js';
import { registerTestimonialIcons } from './testimonials-icons.js';

export interface ITestimonial {
  /** What the person said. */
  content: string;
  name: string;
  role?: string;
  /** The address of a photo of the person. Without it their initials are shown. */
  image?: string;
  /** Stars, from 0 to 5. @default 5 */
  rating?: number;
}

/** The words said to assistive technology. English by default. */
export interface ITestimonialLabels {
  /** The name of the carousel. */
  carousel: string;
  previous: string;
  next: string;
  /** The button that stops the carousel turning by itself. */
  pause: string;
  /** The button that makes it turn by itself again. */
  play: string;
  /** What the stars say ("Rated 5 out of 5"). */
  rating: (rating: number) => string;
  /** The name of a slide ("2 of 3"). */
  slide: (index: number, total: number) => string;
}

export interface ITestimonialCarousel extends IClassName {
  testimonials: readonly ITestimonial[];
  /** How long each testimonial stays, in milliseconds. `0` never turns by itself. @default 5000 */
  interval?: number;
  labels?: Partial<ITestimonialLabels>;
}

const LABELS: ITestimonialLabels = {
  carousel: 'Testimonials',
  previous: 'Previous testimonial',
  next: 'Next testimonial',
  pause: 'Pause the testimonials',
  play: 'Play the testimonials',
  rating: (rating) => `Rated ${String(rating)} out of 5`,
  slide: (index, total) => `${String(index + 1)} of ${String(total)}`,
};

const MAX_STARS = 5;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word).at(0) ?? '')
    .join('')
    .toUpperCase();

const IconButton = ({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="text-tertiary hover:text-primary cursor-pointer rounded-sm p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-crayola-c"
  >
    <Icon icon={icon} className="size-5" />
  </button>
);

/**
 * Testimonials, one at a time, that turn by themselves. It follows what a carousel that moves has to
 * do: it stops while the pointer is over it or the focus is in it, and a button stops it (and starts
 * it again); with a system setting for less motion it does not turn at all. Previous and next buttons
 * go round, and what is announced is the slide that is current, but only while it is not turning.
 */
export const TestimonialCarousel = ({
  testimonials,
  interval = 5000,
  className = '',
  labels,
}: ITestimonialCarousel) => {
  registerTestimonialIcons();

  const text = {
    carousel: labels?.carousel ?? LABELS.carousel,
    previous: labels?.previous ?? LABELS.previous,
    next: labels?.next ?? LABELS.next,
    pause: labels?.pause ?? LABELS.pause,
    play: labels?.play ?? LABELS.play,
    rating: labels?.rating ?? LABELS.rating,
    slide: labels?.slide ?? LABELS.slide,
  };
  const prefersReducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  // what the person chose with the button; `null` while they have not
  const [choice, setChoice] = useState<'paused' | 'playing' | null>(null);

  const count = testimonials.length;
  const shown = Math.min(index, count - 1);
  const canTurn = count > 1 && interval > 0 && !prefersReducedMotion;
  // the button wins over the pointer and the focus: a person who pressed "play" wants it to turn
  const isTurning =
    canTurn && (choice === 'playing' || (choice === null && !isHovered && !isFocused));

  useEffect(() => {
    if (!isTurning) return;

    const timer = window.setTimeout(() => {
      setIndex((current) => (Math.min(current, count - 1) + 1) % count);
    }, interval);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isTurning, shown, count, interval]);

  if (count === 0) return null;

  const go = (step: 1 | -1) => {
    setIndex((current) => (Math.min(current, count - 1) + step + count) % count);
  };

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={text.carousel}
      onPointerEnter={(event: PointerEvent<HTMLDivElement>) => {
        // a touch is not "the pointer is over it": there is no leaving a finger
        if (event.pointerType === 'mouse') setIsHovered(true);
      }}
      onPointerLeave={() => {
        setIsHovered(false);
      }}
      onFocus={() => {
        setIsFocused(true);
      }}
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
      }}
      className={`bg-tertiary-invert relative rounded-lg p-4 ${className}`}
    >
      <div aria-live={isTurning ? 'off' : 'polite'}>
        {testimonials.map((testimonial, position) => {
          const stars = Math.max(
            0,
            Math.min(MAX_STARS, Math.round(testimonial.rating ?? MAX_STARS)),
          );

          return (
            <figure
              key={`${testimonial.name}#${String(position)}`}
              role="group"
              aria-roledescription="slide"
              aria-label={text.slide(position, count)}
              hidden={position !== shown}
              className="group m-0 flex w-full flex-col gap-4"
            >
              <div className="flex flex-col gap-4 leading-6">
                <div className="flex gap-1">
                  <span className="sr-only">{text.rating(stars)}</span>
                  {Array.from({ length: stars }, (_, star) => (
                    <Icon
                      key={star}
                      aria-hidden="true"
                      icon="streamline-ultimate-color:rating-star"
                      className="size-5"
                    />
                  ))}
                </div>
                <blockquote>
                  <p className="text-tertiary group-hover:text-primary text-xs break-words italic before:content-['“'] after:content-['”']">
                    {testimonial.content}
                  </p>
                </blockquote>
              </div>
              <figcaption className="flex items-center gap-2 pr-24">
                {testimonial.image ? (
                  <img
                    src={testimonial.image}
                    alt=""
                    loading="lazy"
                    className="bg-secondary-invert/50 border-primary/50 size-8 shrink-0 rounded-full border object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="bg-secondary-invert/50 border-primary/50 text-secondary grid size-8 shrink-0 place-items-center rounded-full border text-[10px] font-semibold"
                  >
                    {initialsOf(testimonial.name)}
                  </span>
                )}
                <span className="flex flex-col">
                  <cite className="text-secondary text-[10px] font-semibold not-italic">
                    {testimonial.name}
                  </cite>
                  {testimonial.role && (
                    <span className="text-tertiary text-[9px] leading-4">{testimonial.role}</span>
                  )}
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      {count > 1 && (
        <div className="absolute right-4 bottom-4 flex items-center gap-1">
          {canTurn && (
            <IconButton
              icon={choice === 'paused' ? 'solar:play-linear' : 'solar:pause-linear'}
              label={choice === 'paused' ? text.play : text.pause}
              onClick={() => {
                setChoice(choice === 'paused' ? 'playing' : 'paused');
              }}
            />
          )}
          <IconButton
            icon="solar:arrow-left-linear"
            label={text.previous}
            onClick={() => {
              go(-1);
            }}
          />
          <IconButton
            icon="solar:arrow-right-linear"
            label={text.next}
            onClick={() => {
              go(1);
            }}
          />
        </div>
      )}
    </div>
  );
};
