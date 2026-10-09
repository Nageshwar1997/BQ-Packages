import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { TOOLTIP_ANIMATION_DURATION } from '../lib/constants.js';
import { getTooltipArrowCss, getTooltipPosition, getTooltipTransform } from '../lib/tooltip.js';
import type { ITooltip } from '../types/component.js';

const OriginalTooltip = ({
  title,
  description,
  children,
  className = '',
  containerClassName = '',
  placement = 'top',
}: Omit<ITooltip, 'required'>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>();
  const closeTimerRef = useRef<number | undefined>(undefined);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const updateTooltipPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setTooltipStyle(getTooltipPosition(container.getBoundingClientRect(), placement));
  }, [placement]);

  const showTooltip = () => {
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  };

  const openTooltip = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);

    updateTooltipPosition();
    setIsVisible(false);
    setIsOpen(true);
    showTooltip();
  };

  const closeTooltip = () => {
    if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);

    setIsVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, TOOLTIP_ANIMATION_DURATION);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [isOpen, updateTooltipPosition]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex ${containerClassName}`}
      onBlur={closeTooltip}
      onFocus={openTooltip}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
    >
      {/* Main Content */}
      {children}
      {/* Tooltip */}
      {isOpen &&
        tooltipStyle &&
        createPortal(
          <div
            className={`border-silver-jet-2 bg-platinum-jet fixed z-9999 flex flex-col items-center justify-center rounded-lg border px-3 py-2 text-center whitespace-nowrap backdrop-blur-md transition-all duration-400 ease-in-out after:absolute after:border-8 after:border-solid after:border-transparent after:content-[''] ${isVisible ? 'visible opacity-100' : 'invisible opacity-0'} ${getTooltipArrowCss(placement)} ${className} `}
            style={{ ...tooltipStyle, transform: getTooltipTransform(placement, isVisible) }}
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

export const Tooltip = ({ children, required = true, ...props }: ITooltip) => {
  return required ? <OriginalTooltip {...props}>{children}</OriginalTooltip> : children;
};
