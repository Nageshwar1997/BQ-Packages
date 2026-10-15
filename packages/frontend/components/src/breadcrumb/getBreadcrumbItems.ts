import type { IBreadcrumbItem } from './Breadcrumb.js';

export interface IBreadcrumbPathOptions {
  /** What the first item says. @default 'Home' */
  homeLabel?: string;
  /** Where the first item goes. @default '/' */
  homeHref?: string;
  /** Makes the text of a step from its part of the path. The default turns `skin-care` into `skin care`. */
  formatSegment?: (segment: string) => string;
}

const safeDecode = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    // a `%` that is not an escape: the text as it is
    return segment;
  }
};

/** `skin-care` and `skin_care` read `skin care`; `%20` is a space. */
const defaultFormat = (segment: string) => safeDecode(segment).replaceAll(/[-_]+/g, ' ');

/**
 * The items of a breadcrumb for an address: `/products/skin-care/serum` is Home, products, skin care
 * and serum, each with the address of the page it goes to. The query string and the hash are left out,
 * and so are empty parts (`//`, a slash at the end).
 */
export const getBreadcrumbItems = (
  pathname: string,
  {
    homeLabel = 'Home',
    homeHref = '/',
    formatSegment = defaultFormat,
  }: IBreadcrumbPathOptions = {},
): IBreadcrumbItem[] => {
  const path = pathname.split(/[?#]/, 1).at(0) ?? '';
  const segments = path.split('/').filter(Boolean);

  return [
    { label: homeLabel, href: homeHref },
    ...segments.map((segment, index) => ({
      label: formatSegment(segment),
      href: `/${segments.slice(0, index + 1).join('/')}`,
    })),
  ];
};
