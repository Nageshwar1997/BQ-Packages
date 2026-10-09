import { act, type ReactElement, StrictMode, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';

// React only lets `act()` through when it is told it runs inside a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// What is still on the page; a test that fails halfway must not leave its component running for the next one.
const mounted = new Set<() => void>();

/** Unmounts everything `mount` put on the page. Call it after every test. */
export const unmountAll = () => {
  for (const unmount of [...mounted]) unmount();
};

/** Renders `element` into the document, like a page would. Unmount it or it stays there. */
export const mount = (element: ReactElement, { strict = false }: { strict?: boolean } = {}) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(strict ? <StrictMode>{element}</StrictMode> : element);
  });

  const unmount = () => {
    if (!mounted.delete(unmount)) return;

    act(() => {
      root.unmount();
    });
    container.remove();
  };
  mounted.add(unmount);

  return {
    container,
    rerender: (next: ReactElement) => {
      act(() => {
        root.render(strict ? <StrictMode>{next}</StrictMode> : next);
      });
    },
    unmount,
  };
};

/** The small part of Testing Library's `renderHook` that these tests need. */
export const renderHook = <T,>(hook: () => T, options: { strict?: boolean } = {}) => {
  const result = { current: undefined as T, renders: 0 };

  const Probe = () => {
    const value = hook();

    useLayoutEffect(() => {
      result.current = value;
      result.renders += 1;
    });

    return null;
  };

  const view = mount(<Probe />, options);

  return {
    result,
    ...view,
    /** Renders the same component again, as when its parent renders. */
    rerender: () => {
      view.rerender(<Probe />);
    },
  };
};
