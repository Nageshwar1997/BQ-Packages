import { Icon } from '@iconify/react';
import type { MouseEvent, ReactElement } from 'react';

import type { IClassName } from '../types/component.js';

/** A service the person can sign in with. */
export interface ISocialProvider {
  /** The name of the service ("Google"): the link says "Continue with Google". */
  name: string;
  /** An icon of Iconify (`'logos:google-icon'`) or any element. */
  icon: string | ReactElement;
  /** Where the sign in starts. */
  href: string;
}

export interface ISocialAuth extends IClassName {
  providers: readonly ISocialProvider[];
  /**
   * Called when a provider is pressed, before the browser goes to its address: the place to remember
   * where the person was, to bring them back after the sign in.
   */
  onProviderClick?: (provider: ISocialProvider, event: MouseEvent<HTMLAnchorElement>) => void;
  /** What a link says to assistive technology. @default `Continue with ${provider.name}` */
  getLabel?: (provider: ISocialProvider) => string;
  /** The name of the group of links. @default 'Sign in with' */
  label?: string;
}

const defaultGetLabel = (provider: ISocialProvider) => `Continue with ${provider.name}`;

/**
 * A row of icons, each a link that starts a sign in with a service (Google, GitHub...). They are plain
 * links, because signing in with a service leaves the app for the page of the service: an
 * `<a href>`, named "Continue with Google", that also works when opened in a new tab.
 *
 * The icons that are given by name come from the Iconify API unless the app has them registered
 * (`addIcon()`), which also makes them show without a network.
 */
export const SocialAuth = ({
  providers,
  onProviderClick,
  getLabel = defaultGetLabel,
  label = 'Sign in with',
  className = '',
}: ISocialAuth) => {
  if (providers.length === 0) return null;

  return (
    <ul aria-label={label} className={`flex items-center justify-center gap-4 ${className}`}>
      {providers.map((provider) => (
        <li key={provider.name}>
          <a
            href={provider.href}
            aria-label={getLabel(provider)}
            className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-crayola-c"
            onClick={(event) => {
              onProviderClick?.(provider, event);
            }}
          >
            {typeof provider.icon === 'string' ? (
              <Icon
                aria-hidden="true"
                icon={provider.icon}
                className="border-primary/40 shadow-primary/50 h-12 w-12 shrink-0 rounded-xl border bg-white/90 p-2.5 shadow-sm backdrop-blur-sm transition-transform duration-500 hover:scale-110 motion-reduce:transition-none"
              />
            ) : (
              provider.icon
            )}
          </a>
        </li>
      ))}
    </ul>
  );
};
