// @vitest-environment jsdom
import { act, Profiler, StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { Resend } from './Resend.js';

const reportError = vi.fn();

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

/** Lets the promises that are already settled run their `then`, inside `act`. */
const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const click = (element: Element | null) => {
  act(() => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const buttonOf = (container: HTMLElement) => container.querySelector('button');
const timerOf = (container: HTMLElement) => container.querySelector('[role="timer"]');
const statusOf = (container: HTMLElement) => container.querySelector('[role="status"]');

const CODE_LABEL = 'Not received OTP?';

describe('Resend', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('reportError', reportError);
    reportError.mockReset();
  });

  afterEach(() => {
    unmountAll();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('while it waits', () => {
    it('says the label and how long is left, and shows no button', () => {
      const view = mount(<Resend label={CODE_LABEL} count={30} onResend={vi.fn()} />);

      expect(view.container.textContent).toContain(CODE_LABEL);
      expect(timerOf(view.container)?.textContent).toBe('Resend in 30s');
      expect(buttonOf(view.container)).toBeNull();
    });

    it('counts down by the clock, one second at a time', () => {
      const view = mount(<Resend label={CODE_LABEL} count={30} onResend={vi.fn()} />);
      const shown: (string | undefined)[] = [];

      for (let second = 0; second < 4; second += 1) {
        shown.push(timerOf(view.container)?.textContent);
        advance(1000);
      }

      expect(shown).toEqual(['Resend in 30s', 'Resend in 29s', 'Resend in 28s', 'Resend in 27s']);
    });

    it('counts a part of a second as a whole one, so 0 is only shown when it is over', () => {
      const view = mount(<Resend label={CODE_LABEL} count={3} onResend={vi.fn()} />);

      advance(2250); // 0.75 s left, on a tick of the timer
      expect(timerOf(view.container)?.textContent).toBe('Resend in 1s');
      advance(750);
      expect(timerOf(view.container)).toBeNull();
      expect(buttonOf(view.container)).not.toBeNull();
    });

    it('counts the part of a second that is left up when the tab is seen again too', () => {
      const view = mount(<Resend label={CODE_LABEL} count={30} onResend={vi.fn()} />);

      act(() => {
        vi.setSystemTime(Date.now() + 20_500); // 9.5 s left
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(timerOf(view.container)?.textContent).toBe('Resend in 10s');
    });

    it('does not count ticks: a tab that was asleep shows the time that really went by', () => {
      const view = mount(<Resend label={CODE_LABEL} count={30} onResend={vi.fn()} />);

      // the browser ran no timer for 20 s (background tab, closed laptop), then the tab is seen again
      act(() => {
        vi.setSystemTime(Date.now() + 20_000);
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(timerOf(view.container)?.textContent).toBe('Resend in 10s');
    });

    it('ends when the time is up even if the only thing that ran is a late timer', () => {
      const view = mount(<Resend label={CODE_LABEL} count={5} onResend={vi.fn()} />);

      act(() => {
        vi.setSystemTime(Date.now() + 60_000);
        vi.advanceTimersByTime(250);
      });

      expect(buttonOf(view.container)).not.toBeNull();
    });

    it('renders about once a second, not at every tick of its timer', () => {
      const onRender = vi.fn();
      mount(
        <Profiler id="resend" onRender={onRender}>
          <Resend label={CODE_LABEL} count={30} onResend={vi.fn()} />
        </Profiler>,
      );
      const rendersAtStart = onRender.mock.calls.length;

      for (let tick = 0; tick < 20; tick += 1) advance(250); // 5 seconds, tick by tick

      expect(onRender.mock.calls.length - rendersAtStart).toBeLessThanOrEqual(6);
      expect(onRender.mock.calls.length - rendersAtStart).toBeGreaterThanOrEqual(5);
    });

    it('is not a live region: a screen reader is not told the number every second', () => {
      const view = mount(<Resend label={CODE_LABEL} count={30} onResend={vi.fn()} />);

      expect(timerOf(view.container)?.getAttribute('aria-live')).not.toBe('polite');
      expect(timerOf(view.container)?.closest('[aria-live]')).toBeNull();
    });
  });

  describe('when there is nothing to wait for', () => {
    it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'shows the button at once for count %s, and starts no timer',
      (count) => {
        const view = mount(<Resend label={CODE_LABEL} count={count} onResend={vi.fn()} />);

        expect(buttonOf(view.container)).not.toBeNull();
        expect(timerOf(view.container)).toBeNull();
        expect(vi.getTimerCount()).toBe(0);
      },
    );

    it('rounds a number of seconds with a fraction up', () => {
      const view = mount(<Resend label={CODE_LABEL} count={2.2} onResend={vi.fn()} />);

      expect(timerOf(view.container)?.textContent).toBe('Resend in 3s');
    });

    it('does not say "you can resend now" for a button that was there from the start', () => {
      const view = mount(<Resend label={CODE_LABEL} count={0} onResend={vi.fn()} />);

      expect(statusOf(view.container)?.textContent).toBe('');
    });
  });

  describe('when the wait is over', () => {
    it('replaces the countdown with a button, and stops its timers', () => {
      const view = mount(<Resend label={CODE_LABEL} count={3} onResend={vi.fn()} />);

      advance(3000);

      expect(timerOf(view.container)).toBeNull();
      expect(buttonOf(view.container)?.textContent).toBe('Resend');
      expect(vi.getTimerCount()).toBe(0);
    });

    it('is a button that does not submit the form it is in', () => {
      const view = mount(<Resend label={CODE_LABEL} count={0} onResend={vi.fn()} />);

      expect(buttonOf(view.container)?.type).toBe('button');
    });

    it('tells assistive technology, once, that it can be used', () => {
      const view = mount(<Resend label={CODE_LABEL} count={2} onResend={vi.fn()} />);
      expect(statusOf(view.container)?.textContent).toBe('');

      advance(2000);

      expect(statusOf(view.container)?.textContent).toBe('You can resend now');
    });

    it('shows a focus ring for the keyboard', () => {
      const view = mount(<Resend label={CODE_LABEL} count={0} onResend={vi.fn()} />);
      const classes = buttonOf(view.container)?.className.split(/\s+/) ?? [];

      expect(classes).toContain('focus-visible:outline-2');
      // `outline-hidden` sets `--tw-outline-style: none`, which `focus-visible:outline-2` uses: with
      // both, the ring is never drawn (seen in a real browser, jsdom cannot see it).
      expect(classes).not.toContain('outline-hidden');
    });
  });

  describe('resending', () => {
    it('calls onResend once per click and waits again', () => {
      const onResend = vi.fn();
      const view = mount(<Resend label={CODE_LABEL} count={10} onResend={onResend} />);
      advance(10_000);

      click(buttonOf(view.container));

      expect(onResend).toHaveBeenCalledTimes(1);
      expect(buttonOf(view.container)).toBeNull();
      expect(timerOf(view.container)?.textContent).toBe('Resend in 10s');
      expect(statusOf(view.container)?.textContent).toBe(''); // no longer "ready"
    });

    it('can do it again after each wait', () => {
      const onResend = vi.fn();
      const view = mount(<Resend label={CODE_LABEL} count={2} onResend={onResend} />);

      for (let round = 0; round < 3; round += 1) {
        advance(2000);
        click(buttonOf(view.container));
      }

      expect(onResend).toHaveBeenCalledTimes(3);
      expect(timerOf(view.container)?.textContent).toBe('Resend in 2s');
    });

    it('starts the next wait with the count of that moment', () => {
      const onResend = vi.fn();
      const view = mount(<Resend label={CODE_LABEL} count={30} onResend={onResend} />);
      advance(30_000);

      // after the third try the app stops making people wait
      view.rerender(<Resend label={CODE_LABEL} count={0} onResend={onResend} />);
      click(buttonOf(view.container));

      expect(timerOf(view.container)).toBeNull();
      expect(buttonOf(view.container)).not.toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('does not change a wait that is going on when count changes', () => {
      const view = mount(<Resend label={CODE_LABEL} count={30} onResend={vi.fn()} />);
      advance(5000);

      view.rerender(<Resend label={CODE_LABEL} count={5} onResend={vi.fn()} />);

      expect(timerOf(view.container)?.textContent).toBe('Resend in 25s');
    });

    it('calls the onResend of the last render', () => {
      const first = vi.fn();
      const second = vi.fn();
      const view = mount(<Resend label={CODE_LABEL} count={0} onResend={first} />);
      view.rerender(<Resend label={CODE_LABEL} count={0} onResend={second} />);

      click(buttonOf(view.container));

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('starts again from the full count when it is given a new key', () => {
      const view = mount(<Resend key="a@x.com" label={CODE_LABEL} count={30} onResend={vi.fn()} />);
      advance(12_000);

      view.rerender(<Resend key="b@x.com" label={CODE_LABEL} count={30} onResend={vi.fn()} />);

      expect(timerOf(view.container)?.textContent).toBe('Resend in 30s');
      expect(vi.getTimerCount()).toBe(1); // the timer of the first one is gone
    });
  });

  describe('when onResend takes time', () => {
    const deferred = () => {
      let resolve: () => void = () => undefined;
      let reject: (error: unknown) => void = () => undefined;
      const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
      });

      return { promise, resolve, reject };
    };

    it('is busy until it is done: disabled, saying it sends, and not waiting yet', async () => {
      const request = deferred();
      const view = mount(<Resend label={CODE_LABEL} count={30} onResend={() => request.promise} />);
      advance(30_000);

      click(buttonOf(view.container));

      const button = buttonOf(view.container);
      expect(button?.disabled).toBe(true);
      expect(button?.getAttribute('aria-busy')).toBe('true');
      expect(button?.textContent).toBe('Sending…');
      expect(timerOf(view.container)).toBeNull();

      request.resolve();
      await flushPromises();
    });

    it('cannot be sent twice while it is busy', async () => {
      const request = deferred();
      const onResend = vi.fn(() => request.promise);
      const view = mount(<Resend label={CODE_LABEL} count={0} onResend={onResend} />);

      click(buttonOf(view.container));
      click(buttonOf(view.container));
      click(buttonOf(view.container));

      expect(onResend).toHaveBeenCalledTimes(1);

      request.resolve();
      await flushPromises();
    });

    it('does not call it a second time for two clicks in the same moment', async () => {
      const request = deferred();
      const onResend = vi.fn(() => request.promise);
      const view = mount(<Resend label={CODE_LABEL} count={0} onResend={onResend} />);
      const button = buttonOf(view.container);

      act(() => {
        button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(onResend).toHaveBeenCalledTimes(1);

      request.resolve();
      await flushPromises();
    });

    it('starts the wait when the promise resolves', async () => {
      const request = deferred();
      const view = mount(<Resend label={CODE_LABEL} count={20} onResend={() => request.promise} />);
      advance(20_000);
      click(buttonOf(view.container));
      advance(5000); // the request is slow; this time must not count

      request.resolve();
      await flushPromises();

      expect(timerOf(view.container)?.textContent).toBe('Resend in 20s');
      expect(buttonOf(view.container)).toBeNull();
    });

    it('starts the wait with the count of the moment the promise resolves, not of the click', async () => {
      const request = deferred();
      const onResend = () => request.promise;
      const view = mount(<Resend label={CODE_LABEL} count={30} onResend={onResend} />);
      advance(30_000);
      click(buttonOf(view.container));

      // while the request is on its way the app decides nobody has to wait any more
      view.rerender(<Resend label={CODE_LABEL} count={0} onResend={onResend} />);
      request.resolve();
      await flushPromises();

      expect(timerOf(view.container)).toBeNull();
      expect(buttonOf(view.container)?.textContent).toBe('Resend');
    });

    it('does not wait, and can be pressed again, when the promise rejects; the error is reported', async () => {
      const failure = new Error('Network down');
      const request = deferred();
      const view = mount(<Resend label={CODE_LABEL} count={20} onResend={() => request.promise} />);
      advance(20_000);
      click(buttonOf(view.container));

      request.reject(failure);
      await flushPromises();

      expect(reportError).toHaveBeenCalledTimes(1);
      expect(reportError).toHaveBeenCalledWith(failure);
      expect(timerOf(view.container)).toBeNull();
      expect(buttonOf(view.container)?.disabled).toBe(false);
      expect(buttonOf(view.container)?.textContent).toBe('Resend');
    });

    it('reports an error that onResend throws before it returns, and does not wait either', async () => {
      const failure = new Error('Bad state');
      const view = mount(
        <Resend
          label={CODE_LABEL}
          count={20}
          onResend={() => {
            throw failure;
          }}
        />,
      );
      advance(20_000);

      click(buttonOf(view.container));
      await flushPromises();

      expect(reportError).toHaveBeenCalledWith(failure);
      expect(buttonOf(view.container)).not.toBeNull();
    });

    it('does not report anything when it works', async () => {
      const view = mount(
        <Resend label={CODE_LABEL} count={0} onResend={() => Promise.resolve()} />,
      );

      click(buttonOf(view.container));
      await flushPromises();

      expect(reportError).not.toHaveBeenCalled();
    });

    it('is fine with being removed while it waits for the promise', async () => {
      const request = deferred();
      const view = mount(<Resend label={CODE_LABEL} count={0} onResend={() => request.promise} />);
      click(buttonOf(view.container));

      view.unmount();
      request.resolve();
      await flushPromises();

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('its words', () => {
    it('can be said in another language', () => {
      const view = mount(
        <Resend
          label="¿No lo recibiste?"
          count={2}
          onResend={vi.fn()}
          countdownLabel="Reenviar en"
          resendLabel="Reenviar"
          readyLabel="Ya puedes reenviar"
          formatSeconds={(seconds) => `${String(seconds)} segundos`}
        />,
      );
      expect(timerOf(view.container)?.textContent).toBe('Reenviar en 2 segundos');

      advance(2000);
      expect(buttonOf(view.container)?.textContent).toBe('Reenviar');
      expect(statusOf(view.container)?.textContent).toBe('Ya puedes reenviar');
    });

    it('says what it is doing in its own words while it sends', async () => {
      let resolve: () => void = () => undefined;
      const view = mount(
        <Resend
          label={CODE_LABEL}
          count={0}
          sendingLabel="Enviando…"
          onResend={() =>
            new Promise<void>((resolvePromise) => {
              resolve = resolvePromise;
            })
          }
        />,
      );

      click(buttonOf(view.container));

      expect(buttonOf(view.container)?.textContent).toBe('Enviando…');

      resolve();
      await flushPromises();
    });
  });

  describe('in React', () => {
    it('leaves no timer and no listener behind when it is removed', () => {
      const removeListener = vi.spyOn(document, 'removeEventListener');
      const view = mount(<Resend label={CODE_LABEL} count={30} onResend={vi.fn()} />);
      expect(vi.getTimerCount()).toBe(1);

      view.unmount();

      expect(vi.getTimerCount()).toBe(0);
      expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('runs one timer in StrictMode, and counts down in the same way', () => {
      const view = mount(<Resend label={CODE_LABEL} count={30} onResend={vi.fn()} />, {
        strict: true,
      });
      expect(vi.getTimerCount()).toBe(1);

      advance(4000);

      expect(timerOf(view.container)?.textContent).toBe('Resend in 26s');
    });

    it('is the same text on a server and in the browser, whatever time it is', async () => {
      const { renderToString } = await import('react-dom/server');
      vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
      const first = renderToString(<Resend label={CODE_LABEL} count={30} onResend={vi.fn()} />);
      vi.setSystemTime(new Date('2030-06-01T12:34:56Z'));
      const second = renderToString(<Resend label={CODE_LABEL} count={30} onResend={vi.fn()} />);

      expect(first).toBe(second);
      expect(first).toContain('30s');
    });

    it('works inside a form without submitting it', () => {
      const onSubmit = vi.fn((event: Event) => {
        event.preventDefault();
      });
      const form = document.createElement('form');
      form.addEventListener('submit', onSubmit);
      document.body.append(form);
      const view = mount(<Resend label={CODE_LABEL} count={0} onResend={vi.fn()} />);
      form.append(view.container);

      click(buttonOf(view.container));

      expect(onSubmit).not.toHaveBeenCalled();
      form.remove();
    });

    it('survives being rendered inside StrictMode with an async onResend', async () => {
      const view = mount(
        <StrictMode>
          <Resend label={CODE_LABEL} count={0} onResend={() => Promise.resolve()} />
        </StrictMode>,
      );

      click(buttonOf(view.container));
      await flushPromises();

      expect(timerOf(view.container)).toBeNull(); // count is 0: no wait after the resend either
      expect(buttonOf(view.container)).not.toBeNull();
    });
  });

  describe('markup', () => {
    it('is a paragraph that gets the attributes it is given, with the classes after its own', () => {
      const view = mount(
        <Resend
          label={CODE_LABEL}
          count={5}
          onResend={vi.fn()}
          id="resend"
          data-testid="r"
          className="sm:col-span-2"
        />,
      );
      const root = view.container.firstElementChild;

      expect(root?.tagName).toBe('P');
      expect(root?.id).toBe('resend');
      expect(root?.getAttribute('data-testid')).toBe('r');
      expect(root?.className).toBe('space-x-2 sm:col-span-2');
    });

    it('does not give its own props to the page as attributes', () => {
      const view = mount(<Resend label={CODE_LABEL} count={5} onResend={vi.fn()} />);
      const root = view.container.firstElementChild;

      for (const name of ['label', 'count', 'onresend', 'resendlabel', 'formatseconds']) {
        expect(root?.hasAttribute(name), name).toBe(false);
      }
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile with something it cannot do', () => {
    const check = () => {
      // @ts-expect-error it needs to know what to say
      <Resend count={30} onResend={vi.fn()} />;
      // @ts-expect-error it needs to know how long to wait
      <Resend label="x" onResend={vi.fn()} />;
      // @ts-expect-error a resend that does nothing is not a resend
      <Resend label="x" count={30} />;
      // @ts-expect-error count is a number of seconds
      <Resend label="x" count="30" onResend={vi.fn()} />;
      // @ts-expect-error the text is its own
      <Resend label="x" count={30} onResend={vi.fn()}>
        children
      </Resend>;
      <Resend
        label="x"
        count={30}
        onResend={vi.fn()}
        // @ts-expect-error the seconds are given as a number
        formatSeconds={(seconds: string) => seconds}
      />;
    };

    expect(check).toBeTypeOf('function');
  });
});
