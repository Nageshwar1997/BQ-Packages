import { type ReactNode, useEffect, useState } from 'react';

import type { IClassName } from '../types/component.js';
import { BEAUTY_FACTS } from './beauty-facts.js';
import { Teddy } from './Teddy.js';

export interface ILoadingScreen extends IClassName {
  /** What is in the middle, instead of the bear (e.g. the bear and a `WakeUpProgress`). */
  children?: ReactNode;
  /** The facts that come one after the other under the picture. @default BEAUTY_FACTS */
  facts?: readonly ReactNode[];
  /** How long a fact stays, in milliseconds. @default 5000 */
  interval?: number;
  /** What a screen reader says for the screen. @default 'Loading' */
  label?: string;
}

const randomIndex = (length: number, except?: number) => {
  if (length <= 1) return 0;

  const index = Math.floor(Math.random() * (except === undefined ? length : length - 1));

  // one of the others: the same fact twice in a row would look like nothing happened
  return except !== undefined && index >= except ? index + 1 : index;
};

/**
 * The screen of the start of the app: a picture in the middle (the bear unless told another), and a
 * fact under it that is changed every few seconds, for as long as the app is not ready. It covers the
 * window. The facts are not announced when they change (a screen reader only says `label`).
 *
 * It is a screen for the browser: the first fact is chosen at random when it is shown.
 */
export const LoadingScreen = ({
  className = '',
  children,
  facts = BEAUTY_FACTS,
  interval = 5000,
  label = 'Loading',
}: ILoadingScreen) => {
  const [index, setIndex] = useState(() => randomIndex(facts.length));

  useEffect(() => {
    if (facts.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => randomIndex(facts.length, current));
    }, interval);

    return () => {
      window.clearInterval(timer);
    };
  }, [facts.length, interval]);

  const hasChildren = children !== undefined && children !== null && children !== false;

  return (
    <div
      className={`fixed inset-0 z-100 flex h-dvh w-dvw flex-col items-center justify-center px-10 ${
        hasChildren
          ? ''
          : 'bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.5)_0%,rgba(var(--primary-rgb),0.2)_30%,rgba(var(--primary-invert-rgb),0.2)_60%,rgba(var(--primary-invert-rgb),1)_100%)]'
      } ${className}`}
    >
      <span role="status" className="sr-only">
        {label}
      </span>
      {hasChildren ? children : <Teddy />}
      {facts.length > 0 && (
        <div className="border-primary/50 absolute bottom-[10%] mx-10 max-w-4xl rounded-xl border px-4 py-2 text-center backdrop-blur-2xl">
          <p aria-live="off" className="gradient-text-silver text-sm text-shadow-2xs md:text-lg">
            {facts[index % facts.length]}
          </p>
        </div>
      )}
    </div>
  );
};
