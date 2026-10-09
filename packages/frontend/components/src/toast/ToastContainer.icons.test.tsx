// @vitest-environment jsdom
import { _api } from '@iconify/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { Toaster } from './ToastContainer.js';
import type { TToastItem } from './types.js';

// Iconify gets an icon's SVG from its API the first time the icon is shown. With no internet that
// never works, so a toast that is shown for the first time while offline (the "You're offline" one,
// or the error of a request that just failed) would have an empty space where its icon belongs.
// These tests take the API away and check every toast still has its own icon. This file imports
// only the `Toaster`, on purpose: the icons have to arrive through it, not through the test.
const apiRequests: string[] = [];
let realFetch: ReturnType<typeof _api.getFetch>;

const toastOfType = (type: TToastItem['type']): TToastItem => {
  switch (type) {
    case 'progress':
      return { id: 'toast', type, title: 'Uploading', progress: 40 };
    case 'uploads':
      return {
        id: 'toast',
        type,
        title: 'Uploading',
        items: [
          {
            id: 'files',
            label: 'Files',
            status: 'uploading',
            loaded: 5,
            total: 10,
            fileSizes: [10],
          },
        ],
      };
    case 'custom':
      return { id: 'toast', type, children: 'Custom' };
    case 'loading':
      return { id: 'toast', type, title: 'Working' };
    default:
      return { id: 'toast', type, title: 'Title', description: 'Description' };
  }
};

/** What the toast draws as its icon: the first thing in its row (the close "x" comes last). */
const mainIcon = (container: HTMLElement) =>
  container.querySelector('.bg-secondary-invert')?.firstElementChild ?? null;

// A piece of each icon's drawing that no other toast icon has.
const DRAWINGS = {
  warning: 'M5.31171',
  error: 'M5.31171',
  success: 'M8.5 12.5',
  default: 'M12 17.75',
  custom: 'M12 17.75',
  loading: 'M17 3.34',
} as const;

describe('toast icons without a network', () => {
  beforeEach(() => {
    realFetch = _api.getFetch();
    apiRequests.length = 0;
    _api.setFetch((url) => {
      apiRequests.push(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url);

      return Promise.reject(new TypeError('Failed to fetch'));
    });
  });

  afterEach(() => {
    unmountAll();
    if (realFetch) _api.setFetch(realFetch);
    document.body.replaceChildren();
  });

  it.each(Object.keys(DRAWINGS) as (keyof typeof DRAWINGS)[])(
    'a %s toast shows its own icon',
    (type) => {
      const view = mount(<Toaster {...toastOfType(type)} />);

      const icon = mainIcon(view.container);
      expect(icon?.tagName.toLowerCase()).toBe('svg'); // not the empty placeholder of a missing icon
      expect(icon?.innerHTML).toContain(DRAWINGS[type]);
      view.unmount();
    },
  );

  it('does not turn the icon of a loading toast with css as well: it turns by itself', () => {
    const view = mount(<Toaster {...toastOfType('loading')} />);
    const icon = mainIcon(view.container);

    expect(icon?.getAttribute('class')).not.toContain('animate-spin');
    expect(icon?.innerHTML).toContain('<animateTransform');
    view.unmount();
  });

  it('does not ask the icon API for any of them', () => {
    for (const type of Object.keys(DRAWINGS) as (keyof typeof DRAWINGS)[]) {
      mount(<Toaster {...toastOfType(type)} />).unmount();
    }

    expect(apiRequests).toEqual([]);
  });

  it('shows the close button of a toast that can be closed', () => {
    const view = mount(<Toaster {...toastOfType('error')} />);

    const svgs = view.container.querySelectorAll('svg');
    expect(svgs).toHaveLength(2); // the icon and the close "x"
    expect(svgs[1].innerHTML).toContain('M18 6L6 18');
    view.unmount();
  });

  it('shows no close button on a toast that cannot be closed', () => {
    const view = mount(<Toaster {...toastOfType('loading')} />);

    expect(view.container.querySelectorAll('svg')).toHaveLength(1);
    view.unmount();
  });
});
