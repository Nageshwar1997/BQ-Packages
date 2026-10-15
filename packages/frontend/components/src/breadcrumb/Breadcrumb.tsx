import { Icon } from '@iconify/react';
import type { MouseEvent, ReactNode } from 'react';

import { ScrollableGradientContainer } from '../layout/index.js';
import type { IClassName } from '../types/component.js';
import { registerBreadcrumbIcons } from './breadcrumb-icons.js';

export interface IBreadcrumbItem {
  /** What is written for the item. */
  label: ReactNode;
  /**
   * Where the item goes. Without one it is plain text. The last item is the page the person is on: it
   * is never a link, whatever it has.
   */
  href?: string;
}

export interface IBreadcrumb extends IClassName {
  /** The path to the page, from the top: the last one is the page itself. */
  items: readonly IBreadcrumbItem[];
  /**
   * Called when an item is pressed with a plain click, in place of the browser going to the address:
   * the app goes there itself, with its router, without loading the page. A click with a modifier
   * (new tab, new window) and a middle click are left to the browser, so the links keep working as
   * links. Without it the links are plain links.
   */
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  /** The name of the navigation, for assistive technology. @default 'Breadcrumb' */
  label?: string;
}

const isPlainClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 &&
  !event.defaultPrevented &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey &&
  (event.currentTarget.target === '' || event.currentTarget.target === '_self');

/**
 * Where the person is in the site (Home › Products › Face), each step but the last a link to the page
 * above it. It is a list in a `nav`, the last item is marked as the current page, and the arrows
 * between the items are not read out. A path that is too long for the width scrolls, with a fade.
 *
 * The router is the app's: the links are plain `<a href>`; give `onNavigate` to go there without
 * loading the page. `getBreadcrumbItems()` makes the items from a path.
 */
export const Breadcrumb = ({
  items,
  onNavigate,
  label = 'Breadcrumb',
  className = '',
}: IBreadcrumb) => {
  registerBreadcrumbIcons();

  if (items.length === 0) return null;

  return (
    <ScrollableGradientContainer direction="horizontal" className="[&>div]:justify-start">
      <nav aria-label={label} className={`text-secondary ${className}`}>
        <ol className="flex items-center gap-2">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const href = isLast ? undefined : item.href;

            return (
              <li key={index} className="flex items-center gap-2 truncate">
                {href === undefined ? (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={`truncate capitalize ${isLast ? 'opacity-80' : ''}`}
                  >
                    {item.label}
                  </span>
                ) : (
                  <a
                    href={href}
                    className="cursor-pointer truncate capitalize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-crayola-c"
                    onClick={(event) => {
                      if (!onNavigate || !isPlainClick(event)) return;

                      event.preventDefault();
                      onNavigate(href, event);
                    }}
                  >
                    {item.label}
                  </a>
                )}
                {!isLast && (
                  <Icon
                    aria-hidden="true"
                    icon="solar:alt-arrow-right-linear"
                    className="shrink-0"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </ScrollableGradientContainer>
  );
};
