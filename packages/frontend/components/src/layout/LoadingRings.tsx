import type { CSSProperties } from 'react';

import type { IClassName } from '../types/component.js';
import { LoadingText } from './LoadingText.js';

export interface ILoadingRings extends IClassName {
  /** The word under the rings. @default 'Loading' */
  text?: string;
}

// Each ring is a circle with one side of its border drawn, turned in space (`rx`, `ry`, `z` degrees).
const RINGS = [
  { side: 'borderBottomWidth', color: 'red', rx: 45, ry: -45, z: 0 },
  { side: 'borderRightWidth', color: 'green', rx: 55, ry: 15, z: 90 },
  { side: 'borderTopWidth', color: 'blue', rx: 40, ry: 65, z: 180 },
] as const;

/**
 * Three rings that turn in space over a word, for a part of a page that is loading. The size follows
 * the window (`vmin`). The turning is drawn by the `ring-spin` animation of
 * `@beautinique/frontend-styles`, and stops for a person who asked for less motion.
 */
export const LoadingRings = ({ className = '', text = 'Loading' }: ILoadingRings) => (
  <div className={`flex h-full w-full items-center justify-center ${className}`}>
    <div className="relative flex flex-col items-center">
      <div aria-hidden="true" className="relative h-[20vmin] w-[20vmin]">
        {RINGS.map((ring, index) => (
          <div
            key={ring.side}
            className="absolute inset-0 animate-[ring-spin_2s_linear_infinite] rounded-full border-solid shadow-[0_0_10px_rgb(var(--primary-rgb),0.15)] motion-reduce:animate-none"
            style={
              {
                '--rx': `${String(ring.rx)}deg`,
                '--ry': `${String(ring.ry)}deg`,
                '--z': `${String(ring.z)}deg`,
                borderColor: ring.color,
                [ring.side]: '0.6vmin',
                animationDelay: `${String(index * -0.5)}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <LoadingText text={text} className="mt-[2vmin]" />
    </div>
  </div>
);
