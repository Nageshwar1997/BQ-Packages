import type { IClassName } from '../types/component.js';
import { LoadingRings } from './LoadingRings.js';

export interface ILoadingPage extends IClassName {
  /** The word under the rings. @default 'Loading' */
  text?: string;
}

/**
 * A whole page that is loading: the rings in the middle of the window, over what is behind. Put it
 * where the page goes (a route that is still being loaded).
 */
export const LoadingPage = ({ text, className = '' }: ILoadingPage) => (
  <div
    className={`bg-primary-invert/50 fixed inset-0 z-100 flex h-full w-full items-center justify-center ${className}`}
  >
    <LoadingRings text={text} />
  </div>
);
