import { type ComponentProps, useEffect, useRef, useState } from 'react';

import { getSecondsLeft, isPromiseLike, toSeconds } from '../lib/countdown.js';
import { GradientText } from '../ui/GradientText.js';

export interface IResend extends Omit<ComponentProps<'p'>, 'children'> {
  /** What is said before the countdown or the button, e.g. `"Didn't get the code?"`. */
  label: string;
  /**
   * How many seconds to wait before it can be asked again. The wait starts when the component is
   * shown (the thing was just sent) and again after each resend, with the `count` of that moment, so
   * an app can stop making people wait after a few tries by passing 0. A change of `count` in the
   * middle of a wait does not change that wait; to start over (a new email address), give the
   * component a new `key`.
   */
  count: number;
  /**
   * Asks again. When it returns a promise, the button waits for it (it cannot be pressed twice, and
   * says it is sending) and the wait starts when it resolves; if it rejects there is no wait, the
   * button can be pressed again and the error is reported to the window like any uncaught error.
   * Handle the errors you can recover from (a toast) inside it.
   */
  onResend: () => unknown;
  /** @default 'Resend' */
  resendLabel?: string;
  /** What comes before the seconds while waiting. @default 'Resend in' */
  countdownLabel?: string;
  /** The button while `onResend` is waiting for its promise. @default 'Sending…' */
  sendingLabel?: string;
  /** Read out by assistive technology when the wait ends. @default 'You can resend now' */
  readyLabel?: string;
  /** How the seconds are written. @default (seconds) => `${seconds}s` */
  formatSeconds?: (seconds: number) => string;
}

const defaultFormatSeconds = (seconds: number) => `${String(seconds)}s`;

// No `outline-hidden` here: in Tailwind v4 it sets `--tw-outline-style: none`, which the
// `focus-visible:outline-2` below uses for its style, so the ring would never be drawn. A button only
// shows the browser's own ring for the keyboard anyway (`:focus-visible`), never for a click.
const BUTTON_CSS =
  'cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-crayola-c disabled:cursor-wait disabled:opacity-60';

/**
 * "Didn't get the code? Resend in 30s" and, once the wait is over, a button to ask again. The wait is
 * measured against the clock, not counted tick by tick, so a tab that was in the background or a
 * laptop that slept does not leave people waiting longer than the time that really went by.
 */
export const Resend = ({
  label,
  count,
  onResend,
  resendLabel = 'Resend',
  countdownLabel = 'Resend in',
  sendingLabel = 'Sending…',
  readyLabel = 'You can resend now',
  formatSeconds = defaultFormatSeconds,
  className = '',
  ...pProps
}: IResend) => {
  // What is rendered first is the same on the server and in the browser: the wait starts when the
  // component is on the page (the effect below), never from the time the render happened.
  const [wait, setWait] = useState(() => ({ seconds: toSeconds(count) }));
  const [secondsLeft, setSecondsLeft] = useState(wait.seconds);
  const [isReady, setIsReady] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const countRef = useRef(count);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  useEffect(() => {
    if (wait.seconds <= 0) return;

    const endsAt = Date.now() + wait.seconds * 1000;
    let shown = wait.seconds;

    const update = () => {
      const left = getSecondsLeft(endsAt, Date.now());

      // Several ticks fall in every second; the state is only set (and React only asked to render,
      // which it sometimes does even for a value that is the same) when the second changes.
      if (left !== shown) {
        shown = left;
        setSecondsLeft(left);
      }
      if (left > 0) return;

      window.clearInterval(timer);
      setIsReady(true);
    };

    // Several times a second, not once: a tick that comes a little late still shows the right second.
    const timer = window.setInterval(update, 250);
    // A background tab runs timers rarely; come back to the right number as soon as it is seen.
    document.addEventListener('visibilitychange', update);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [wait]);

  const startWait = () => {
    const seconds = toSeconds(countRef.current);

    setIsReady(false);
    setSecondsLeft(seconds);
    setWait({ seconds });
  };

  const resend = async () => {
    if (isSendingRef.current) return;

    const result = onResend();

    // `onResend` that does not return a promise (most) starts the wait at once, as the click.
    if (!isPromiseLike(result)) {
      startWait();

      return;
    }

    isSendingRef.current = true;
    setIsSending(true);

    try {
      await result;
      startWait();
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  return (
    <p {...pProps} className={`space-x-2 ${className}`}>
      <GradientText text={label} type="silver" className="text-xs sm:text-sm" />

      {secondsLeft > 0 ? (
        <span role="timer" className="text-muted text-xs sm:text-sm">
          <GradientText text={countdownLabel} type="silver" />{' '}
          <GradientText text={formatSeconds(secondsLeft)} type="accent" className="font-semibold" />
        </span>
      ) : (
        <button
          type="button"
          disabled={isSending}
          aria-busy={isSending || undefined}
          onClick={() => {
            // `reportError` is what the browser does for an error nobody caught: it is reported to
            // `window` (and to the error tracker of the app) instead of vanishing in a dropped promise.
            resend().catch((error: unknown) => {
              reportError(error);
            });
          }}
          className={BUTTON_CSS}
        >
          <GradientText
            type="accent"
            text={isSending ? sendingLabel : resendLabel}
            className="text-xs font-semibold sm:text-sm"
          />
        </button>
      )}

      {/* Said once, when the wait ends: a person using a screen reader cannot see the button appear. */}
      <span role="status" className="sr-only">
        {isReady ? readyLabel : ''}
      </span>
    </p>
  );
};
