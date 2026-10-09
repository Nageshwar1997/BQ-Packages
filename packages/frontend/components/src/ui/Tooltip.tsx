import {
  cloneElement,
  type CSSProperties,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { TOOLTIP_ANIMATION_DURATION } from '../lib/constants.js';
import {
  getTooltipArrowCss,
  getTooltipLayout,
  getTooltipTransform,
  isSameTooltipLayout,
  type ITooltipLayout,
} from '../lib/tooltip.js';
import type { ITooltip } from '../types/component.js';

/*
 * `required={false}` keeps the wrapper (as `display: contents`, so it takes no room) instead of
 * returning the content alone: the content then stays in the same place of the tree when `required`
 * changes, and keeps its state (an open select, a focused input) instead of being created again.
 */
export const Tooltip = ({
  title,
  description,
  children,
  className = '',
  containerClassName = '',
  placement = 'top',
  required = true,
}: ITooltip) => {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [layout, setLayout] = useState<ITooltipLayout>();
  const closeTimerRef = useRef<number | undefined>(undefined);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Places the tooltip from where the content is now and, once the tooltip is on the page, from its
  // size too, so it can open on the other side or be pushed in when it would leave the window.
  const updateLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const next = getTooltipLayout({
      rect: container.getBoundingClientRect(),
      placement,
      size: tooltipRef.current?.getBoundingClientRect(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });

    // the same place again: no new state, so no render
    setLayout((current) => (current && isSameTooltipLayout(current, next) ? current : next));
  }, [placement]);

  const openTooltip = () => {
    if (!required) return;

    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);

    updateLayout();
    setIsVisible(false);
    setIsOpen(true);
    // two frames, so the browser has drawn it hidden first and the fade has something to start from
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  };

  const closeTooltip = useCallback(() => {
    if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    // Without this, a close that was asked twice (the mouse leaves, then the focus does) leaves the
    // first timer running with nobody holding it: it closes a tooltip the mouse has come back to.
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);

    setIsVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, TOOLTIP_ANIMATION_DURATION);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Escape closes it, as a person who cannot move the mouse away has no other way to (WCAG 1.4.13).
  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTooltip();
    };

    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, closeTooltip]);

  // Follows the content while the window is resized or scrolled: at most once a frame, however
  // many scroll events there are.
  useLayoutEffect(() => {
    if (!isOpen) return;

    updateLayout();

    let frame: number | undefined;
    const scheduleUpdate = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        updateLayout();
      });
    };

    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isOpen, updateLayout]);

  // While the tooltip is there, the content is described by it (read by a screen reader when the
  // content has the focus). `useMemo` keeps the element the same between the renders the tooltip
  // makes by itself, so the content is not rendered again for each of them.
  const trigger = useMemo(() => {
    if (!required || !isOpen || !isValidElement<{ 'aria-describedby'?: string }>(children)) {
      return children;
    }

    const describedBy = children.props['aria-describedby'];

    return cloneElement(children, {
      'aria-describedby': describedBy ? `${describedBy} ${id}` : id,
    });
  }, [children, id, isOpen, required]);

  const isShown = required && isOpen && layout !== undefined;

  return (
    <div
      ref={containerRef}
      className={required ? `relative inline-flex ${containerClassName}` : 'contents'}
      onBlur={closeTooltip}
      onFocus={openTooltip}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
    >
      {/* Main Content */}
      {trigger}
      {/* Tooltip */}
      {isShown &&
        createPortal(
          <div
            ref={tooltipRef}
            id={id}
            role="tooltip"
            className={`border-silver-jet-2 bg-platinum-jet fixed z-9999 flex flex-col items-center justify-center rounded-lg border px-3 py-2 text-center whitespace-nowrap backdrop-blur-md transition-all duration-400 ease-in-out after:absolute after:border-8 after:border-solid after:border-transparent after:content-[''] ${isVisible ? 'visible opacity-100' : 'invisible opacity-0'} ${getTooltipArrowCss(layout.placement)} ${className} `}
            style={
              {
                ...layout.position,
                '--tooltip-arrow-shift': `${String(layout.arrowShift)}px`,
                transform: getTooltipTransform(layout.placement, isVisible),
              } as CSSProperties
            }
          >
            <div className="text-primary text-xs font-medium">{title}</div>
            {description && (
              <div className="text-tertiary text-[10px] font-light">{description}</div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};
