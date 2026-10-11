import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';

/** `accent`: the blue gradient of the brand. `silver`: the quiet grey one. */
export type TGradientTextType = 'accent' | 'silver';

/** The text is given as `text`, or as `children` (anything React can show), not both. */
type TGradientTextContent =
  { text: string; children?: never } | { children: ReactNode; text?: never };

interface IGradientTextOwnProps<TAs extends ElementType> {
  /**
   * What renders the text: an element (`'a'`, `'p'`, ...) or a component, e.g. the `Link` of the
   * router, which then gets its own props (`to`) next to these.
   * @default 'span'
   */
  as?: TAs;
  type: TGradientTextType;
  className?: string;
}

export type IGradientText<TAs extends ElementType = 'span'> = IGradientTextOwnProps<TAs> &
  TGradientTextContent &
  Omit<ComponentPropsWithRef<TAs>, 'as' | 'type' | 'className' | 'text' | 'children'>;

const BASE_CSS = 'text-fill-transparent w-fit';
// In forced-colors mode (Windows high contrast) the browser draws no background, so a text that is
// only a transparent fill over a gradient would vanish: there it takes the colour of the system.
const FORCED_COLORS_CSS =
  'forced-colors:bg-none forced-colors:[-webkit-text-fill-color:currentColor]';

const GRADIENT_CSS: Record<TGradientTextType, string> = {
  accent: 'bg-accent-duo',
  silver: 'bg-silver-duo',
};

/**
 * Text filled with a gradient. A link is a text that is rendered by a link component:
 * `<GradientText as={Link} to="/terms" type="accent" text="Terms" />`; the router is the app's, not
 * this package's.
 */
export const GradientText = <TAs extends ElementType = 'span'>({
  as,
  type,
  text,
  children,
  className = '',
  ...rest
}: IGradientText<TAs>) => {
  const Component: ElementType = as ?? 'span';

  return (
    <Component
      {...rest}
      className={`${BASE_CSS} ${GRADIENT_CSS[type]} ${FORCED_COLORS_CSS} ${className}`}
    >
      {children ?? text}
    </Component>
  );
};
