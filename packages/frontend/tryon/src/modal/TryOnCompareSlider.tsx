import { Icon } from '@iconify/react';
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';

import type { IObjectFitContentRect } from '../types/index.js';
import { getObjectFitContentRect } from '../utils/index.js';

interface ITryOnCompareSliderProps {
  // Fires with a 0-1 fraction as the handle is dragged, throttled to at most once per animation
  // frame (see `scheduleOnDrag` below) - the caller forwards this straight to the stage ref's
  // `setComparePosition` (see TryOnModal, which also centers it at 0.5 the moment compare mode
  // turns on). For Upload mode that call triggers a full canvas redraw (`renderFrame`), so
  // firing it once per raw pointermove instead - some devices report those far faster than
  // 60/s - would mean redrawing far more often than the screen can even show.
  onDrag: (position: number) => void;
  // The canvas actually being drawn to (`stageRef.current?.getCanvas()`). Its CSS box - this
  // component's own `inset-0` container - doesn't necessarily match where the image is really
  // rendered: Upload mode uses `object-contain` (see TryOnUploadStage.tsx), which can letterbox
  // it smaller than the box; Live mode uses `object-cover`, which can crop it larger. Either way
  // `renderFrame`'s own split line is drawn in the canvas *bitmap's* coordinate space, so without
  // correcting for this, the drag handle and the line it's supposed to control visibly disagree.
  // `null` while not yet available - falls back to treating the box as the content itself.
  canvas: HTMLCanvasElement | null;
  className?: string;
}

const FULL_CONTENT_RECT: IObjectFitContentRect = { leftPercent: 0, widthPercent: 100 };

// How far an arrow key moves the divider (a fraction of the picture); Shift goes four times as far, Page
// Up / Page Down twice as far as an arrow.
export const COMPARE_KEY_STEP = 0.05;

const TryOnCompareSlider = ({ canvas, onDrag, className = '' }: ITryOnCompareSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0.5);
  const [contentRect, setContentRect] = useState<IObjectFitContentRect>(FULL_CONTENT_RECT);

  // Where the canvas's rendered image actually sits within this component's own box (as a
  // horizontal offset/width, both in percent of that box) - recalculated on container resize.
  // `object-fit` is read fresh each time rather than cached: resizes are infrequent (unlike
  // pointermove, this isn't a hot path), so there's no real cost to also staying correct if a
  // future canvas ever changed it dynamically instead of via a fixed class.
  useEffect(() => {
    const container = containerRef.current;
    if (!canvas || !container) {
      setContentRect(FULL_CONTENT_RECT);
      return;
    }

    const recompute = () => {
      const box = container.getBoundingClientRect();
      setContentRect(
        getObjectFitContentRect(
          box.width,
          box.height,
          canvas.width,
          canvas.height,
          getComputedStyle(canvas).objectFit,
        ),
      );
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [canvas]);

  // Coalesces every `onDrag` call within a single animation frame down to one, keeping only the
  // latest position - the visual divider (`position` state) still updates immediately on every
  // pointermove for a smooth drag feel, only the expensive canvas-redraw side is throttled.
  const rafIdRef = useRef<number | null>(null);
  const latestPositionRef = useRef(0.5);

  useEffect(
    () => () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    },
    [],
  );

  const scheduleOnDrag = (value: number) => {
    latestPositionRef.current = value;
    if (rafIdRef.current !== null) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      onDrag(latestPositionRef.current);
    });
  };

  // Cached per drag gesture (set on pointerdown, reused through every pointermove until the next
  // pointerdown) rather than re-measured on every single move - the container's own position
  // can't realistically change mid-gesture, so there's no need to force a layout read that often.
  const dragRectRef = useRef<DOMRect | null>(null);

  const updatePosition = (clientX: number, rect: DOMRect) => {
    const contentLeft = rect.left + (contentRect.leftPercent / 100) * rect.width;
    const contentWidth = (contentRect.widthPercent / 100) * rect.width;
    if (contentWidth <= 0) return;

    const fraction = (clientX - contentLeft) / contentWidth;
    const clamped = Math.max(0, Math.min(1, fraction));
    setPosition(clamped);
    scheduleOnDrag(clamped);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    dragRectRef.current = rect;
    updatePosition(event.clientX, rect);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // Pointer capture (set on down) keeps this firing even once the pointer leaves the
    // container's bounds mid-drag - no need for window-level listeners.
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || !dragRectRef.current) return;
    updatePosition(event.clientX, dragRectRef.current);
  };

  // The same divider, for the keyboard: it is a slider, so the arrows move it, Home and End go to the
  // ends. (A person who cannot drag still has to be able to see the before and the after.)
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? COMPARE_KEY_STEP * 4 : COMPARE_KEY_STEP;
    let next: number;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = position - step;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = position + step;
        break;
      case 'PageDown':
        next = position - COMPARE_KEY_STEP * 2;
        break;
      case 'PageUp':
        next = position + COMPARE_KEY_STEP * 2;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 1;
        break;
      default:
        return;
    }

    event.preventDefault();

    const clamped = Math.max(0, Math.min(1, next));
    setPosition(clamped);
    scheduleOnDrag(clamped);
  };

  // Composes the content area's own offset with the drag position within it - this is what
  // actually lines the divider up with `renderFrame`'s split, not `position` alone.
  const dividerLeftPercent = contentRect.leftPercent + position * contentRect.widthPercent;
  const percent = Math.round(position * 100);

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label="Compare before and after"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${String(percent)}% before, ${String(100 - percent)}% after`}
      className={`absolute inset-0 z-4 cursor-ew-resize touch-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onKeyDown={handleKeyDown}
    >
      {/* Fixed corner labels - not tied to the drag position, just marking which side is which.
          Dark glass / brand gradient (not theme tokens) so they read over any photo. */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-between text-[10px]/none font-semibold tracking-wide text-white uppercase sm:text-xs/none">
        <span className="rounded-full border border-white/15 bg-black/45 px-2.5 pt-1.5 pb-1 shadow-md backdrop-blur-md">
          Before
        </span>
        <span className="bg-sky-blue-burst shadow-secondary-btn rounded-full px-2.5 pt-1.5 pb-1">
          After
        </span>
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.45)]"
        style={{ left: `${String(dividerLeftPercent)}%` }}
      />
      <div
        className="pointer-events-none absolute top-1/2 flex size-10 items-center justify-center rounded-full bg-white text-black/70 shadow-lg ring-4 ring-white/30"
        style={{ left: `${String(dividerLeftPercent)}%`, transform: 'translate(-50%, -50%)' }}
      >
        <Icon icon="solar:arrow-left-linear" className="size-3.5" />
        <Icon icon="solar:arrow-right-linear" className="-ml-0.5 size-3.5" />
      </div>
    </div>
  );
};

export default TryOnCompareSlider;
