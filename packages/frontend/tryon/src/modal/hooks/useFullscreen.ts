import { type RefObject, useCallback, useEffect, useState } from 'react';

/**
 * Fullscreen toggle scoped to one element (the Try-On canvas panel - so the controls/dock inside it
 * come along, not just the bare canvas). Tracks the *browser's* state through `fullscreenchange`
 * rather than its own flag, so leaving with Esc / the browser's own exit gesture keeps the button
 * in sync too.
 *
 * `isSupported` is the one thing callers should gate the button on. `document.fullscreenEnabled`
 * already separates the browsers that matter (confirmed on a real iPhone: Chrome - which enables
 * element fullscreen - has it, Safari doesn't); on top of that a request that gets refused flips it
 * to false, so a browser that claims support but won't deliver ends up without the button instead of
 * with one that does nothing.
 */
export default function useFullscreen(targetRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wasRefused, setWasRefused] = useState(false);
  const isSupported = document.fullscreenEnabled && !wasRefused;

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(
        document.fullscreenElement !== null && document.fullscreenElement === targetRef.current,
      );
    };

    document.addEventListener('fullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
    };
  }, [targetRef]);

  const toggle = useCallback(() => {
    const target = targetRef.current;
    if (!target) return;

    if (document.fullscreenElement === target) {
      void document.exitFullscreen();
      return;
    }

    target.requestFullscreen().catch(() => {
      setWasRefused(true);
    });
  }, [targetRef]);

  return { isSupported, isFullscreen, toggle };
}
