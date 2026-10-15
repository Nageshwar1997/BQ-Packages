import '@beautinique/frontend-styles/teddy.css';

import type { ComponentProps } from 'react';

export type TTeddy = Omit<ComponentProps<'div'>, 'children' | 'className'>;

/**
 * The bear of the loading screen, drawn with css (`teddy.css` of `@beautinique/frontend-styles`, which
 * this imports). It is a picture with a name: a screen reader says "Loading Teddy" unless given another
 * `aria-label`.
 */
export const Teddy = (divProps: TTeddy) => (
  <div aria-label="Loading Teddy" role="img" {...divProps} className="article">
    <div className="body">
      <div className="shadow" />
      <div className="chest">
        <div className="leg" />
        <div className="leg" />
        <div className="arm" />
        <div className="arm" />
      </div>
    </div>
    <div className="head">
      <div className="ear" />
      <div className="ear" />
      <div className="face">
        <div className="eye" />
        <div className="eye" />
        <div className="nose" />
        <div className="cheek" />
        <div className="cheek" />
        <div className="mouth" />
        <div className="hair" />
      </div>
    </div>
  </div>
);
