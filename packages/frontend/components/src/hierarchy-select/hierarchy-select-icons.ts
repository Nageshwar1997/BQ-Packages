import type { IconifyJSON } from '@iconify/react';

import { createIconRegistry } from '../lib/icon-registry.js';

/*
 * The icons of the tree of the hierarchy select and its search, bundled so they show without a network and without waiting for the
 * Iconify API (see `toast/toast-icons.ts`). The data is what
 * `https://api.iconify.design/<prefix>.json?icons=<name>` answers.
 */
const ICON_SETS: IconifyJSON[] = [
  {
    prefix: 'solar',
    width: 24,
    height: 24,
    icons: {
      'alt-arrow-down-linear': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9L12 15L5 9"/>',
      },
      'alt-arrow-right-linear': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5L15 12L9 19"/>',
      },
      'folder-open-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M4 11.5V5.71231C4 5.05041 4 4.71946 4.05548 4.44379C4.29971 3.23023 5.31225 2.28098 6.60671 2.05201C6.90076 2 7.25377 2 7.9598 2C8.26914 2 8.42381 2 8.57246 2.01303C9.21332 2.06921 9.82122 2.30528 10.3168 2.69039C10.4317 2.77971 10.5411 2.88224 10.7598 3.08731L11.2 3.5C11.8526 4.11183 12.1789 4.41775 12.5697 4.62157C12.7844 4.73353 13.012 4.82195 13.2483 4.88508C13.6783 5 14.1398 5 15.0627 5H15.3617C17.4676 5 18.5205 5 19.2049 5.5771C19.2679 5.63018 19.3278 5.68635 19.3844 5.74537C20 6.38701 20 7.37415 20 9.34843V11.5"/><path d="M10 17H14"/><path d="M3.47674 17.4839C2.99958 14.7678 2.761 13.4097 3.33908 12.433C3.4866 12.1838 3.66852 11.9582 3.87908 11.7634C4.7042 11 6.0379 11 8.7053 11H15.2947C17.9621 11 19.2958 11 20.1209 11.7634C20.3315 11.9582 20.5134 12.1838 20.6609 12.433C21.239 13.4097 21.0004 14.7678 20.5233 17.4839C20.1798 19.4391 20.008 20.4167 19.4129 21.0655C19.2585 21.2338 19.0858 21.383 18.8982 21.5101C18.175 22 17.2149 22 15.2947 22H8.70531C6.7851 22 5.825 22 5.10183 21.5101C4.9142 21.383 4.74145 21.2338 4.58706 21.0655C3.99198 20.4167 3.82024 19.4391 3.47674 17.4839Z"/></g>',
      },
      'folder-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M18 10L13 10"/><path d="M2 6.94975C2 6.06722 2 5.62595 2.06935 5.25839C2.37464 3.64031 3.64031 2.37464 5.25839 2.06935C5.62595 2 6.06722 2 6.94975 2C7.33642 2 7.52976 2 7.71557 2.01738C8.51665 2.09229 9.27652 2.40704 9.89594 2.92051C10.0396 3.03961 10.1763 3.17633 10.4497 3.44975L11 4C11.8158 4.81578 12.2237 5.22367 12.7121 5.49543C12.9804 5.64471 13.2651 5.7626 13.5604 5.84678C14.0979 6 14.6747 6 15.8284 6H16.2021C18.8345 6 20.1506 6 21.0062 6.76946C21.0849 6.84024 21.1598 6.91514 21.2305 6.99383C22 7.84935 22 9.16554 22 11.7979V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V6.94975Z"/></g>',
      },
      'file-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M13 2.2627V5.0003C13 7.35732 13 8.53583 13.7322 9.26806C14.4645 10.0003 15.643 10.0003 18 10.0003H21.58"/><path stroke-linejoin="round" d="M3.17139 3.17157C4.34296 2 6.23851 2 10.0296 2C11.5546 2 12.3173 2.00011 13.0093 2.26562C13.7012 2.53114 14.2651 3.03857 15.3929 4.05365L19.3516 7.61621C20.6558 8.78998 21.3078 9.3774 21.6538 10.1543C21.9998 10.9312 22 11.8079 22 13.5625V14C22 17.7712 22 19.6566 20.8284 20.8281C19.6569 21.9997 17.7712 22 14 22L9.9969 21.9997C6.22761 21.9997 4.34284 21.9997 3.17157 20.8284C2 19.6569 2 17.7712 2 14V9.9982C2 6.22817 2 4.34296 3.17139 3.17157Z"/></g>',
      },
      'unread-linear': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 12.9L10.1429 16.5L18 7.5"/>',
      },
      'magnifier-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="11.5" cy="11.5" r="9.5"/><path d="M18.2173 18.2178L21.9999 22.0004"/></g>',
      },
    },
    aliases: {
      'magnifer-linear': { parent: 'magnifier-linear' },
    },
  },
  {
    prefix: 'lucide',
    width: 24,
    height: 24,
    icons: {
      x: {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12"/>',
      },
    },
  },
];

/**
 * Registers the icons above with Iconify; the components of this entry call it when they render
 * (calling it again is harmless).
 */
export const { register: registerHierarchySelectIcons, names: HIERARCHY_SELECT_ICON_NAMES } =
  createIconRegistry(ICON_SETS);
