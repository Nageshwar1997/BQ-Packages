import { createToastStore } from '@beautinique/frontend-stores';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IButton, IClassName, IIconButton, ITextButton, ITooltip } from './index.js';
import * as root from './index.js';
import type {
  IToastContainer,
  IToaster,
  IUploadGroup,
  IUploadItem,
  IUploadItemHandle,
  IUploadsSummary,
  TToast,
  TToasterKit,
  TToastItem,
  TToastStore,
  TUploadItemStatus,
} from './toast/index.js';
import * as toast from './toast/index.js';
import * as ui from './ui/index.js';

// What the package gives to the apps, per import path. Nothing else may be reachable: an internal
// helper that leaks becomes a promise to keep it.
describe('the public API of the package', () => {
  it('exports from the root exactly what /ui and /toast export', () => {
    const names = new Set([...Object.keys(ui), ...Object.keys(toast)]);

    expect(Object.keys(root).sort()).toEqual([...names].sort());
  });

  // The root re-exports, it does not copy (see `tsup.config.ts` and `built-files.test.ts`).
  it('gives the very same values from the root and from /ui and /toast, not copies', () => {
    const source: Record<string, unknown> = { ...ui, ...toast };

    for (const [name, value] of Object.entries(root)) {
      expect(value, name).toBe(source[name]);
    }
  });

  it('makes a toaster for the store of the app, through the root as through /toast', () => {
    const store = createToastStore<TToast>();

    root.createToaster(store).toaster.default({ title: 'From the root' });
    toast.createToaster(store).toaster.default({ title: 'From /toast' });

    expect(store.getState().toasts.map(({ title }) => title)).toEqual([
      'From the root',
      'From /toast',
    ]);
  });

  // The store is the app's: it makes it, and gives it to the container and to `createToaster`. If the
  // package made one itself and exported it, there would be two ways to get a store.
  it('does not export a toast store, nor a toaster that has one of its own', () => {
    for (const name of ['useToastStore', 'toaster', 'withProgressToast', 'runUploadsInToast']) {
      expect(Object.keys(root), name).not.toContain(name);
      expect(Object.keys(toast), name).not.toContain(name);
    }
  });

  it('exports exactly these values from /ui', () => {
    expect(Object.keys(ui).sort()).toEqual(['Button', 'Tooltip']);
  });

  it('exports exactly these values from /toast', () => {
    expect(Object.keys(toast).sort()).toEqual([
      'TOAST_ICON_NAMES',
      'ToastContainer',
      'Toaster',
      'createToaster',
      'getFormDataFiles',
      'getUploadItemFilesDone',
      'getUploadItemPercent',
      'getUploadsSummary',
      'isUploadItemSettled',
    ]);
  });

  it('exports these types', () => {
    expectTypeOf<IButton['pattern']>().toEqualTypeOf<
      'primary' | 'secondary' | 'tertiary' | 'outline' | 'transparent'
    >();
    expectTypeOf<IClassName>().toBeObject();
    expectTypeOf<ITextButton['content']>().toBeString();
    expectTypeOf<IIconButton['buttonProps']>().toBeObject();
    expectTypeOf<IButton>().toEqualTypeOf<ITextButton | IIconButton>();
    expectTypeOf<ITooltip['placement']>().toEqualTypeOf<
      'top' | 'bottom' | 'left' | 'right' | undefined
    >();
    expectTypeOf<TToastItem>().toBeObject();
    expectTypeOf<TToast['type']>().toBeString();
    expectTypeOf<TUploadItemStatus>().toEqualTypeOf<
      'pending' | 'uploading' | 'success' | 'error'
    >();
    expectTypeOf<IUploadItem['status']>().toEqualTypeOf<TUploadItemStatus>();
    expectTypeOf<IUploadItemHandle['run']>().toBeFunction();
    expectTypeOf<IUploadGroup['end']>().toBeFunction();
    expectTypeOf<IUploadsSummary['percent']>().toBeNumber();
    expectTypeOf<IToastContainer['store']>().toEqualTypeOf<TToastStore>();
    expectTypeOf<TToasterKit['toaster']>().toEqualTypeOf<IToaster>();
    expectTypeOf<TToasterKit>().toHaveProperty('withProgressToast');
    expectTypeOf<TToasterKit>().toHaveProperty('runUploadsInToast');
  });
});

// The app makes the store with the toasts of this package. The `@ts-expect-error` lines are checked
// by the type check of the package (`npm run typecheck`), not by vitest.
describe('the store of the app', () => {
  it('is made with the toasts of this package, and given to the toaster and to the container', () => {
    const useToastStore = createToastStore<TToast>();

    expectTypeOf(useToastStore).toEqualTypeOf<TToastStore>();
    expectTypeOf(root.createToaster).parameter(0).toEqualTypeOf<TToastStore>();
    expectTypeOf(root.ToastContainer).parameter(0).toEqualTypeOf<IToastContainer>();
  });

  it('has to be a store of these toasts', () => {
    const other = createToastStore<{ type: 'other' }>();

    // @ts-expect-error a store of other toasts is not a toast store of this package
    const toaster = root.createToaster(other);

    expect(toaster).toBeDefined();
  });
});

// If this type were exported, the next line would have no error: the comment would be reported as
// unused and the type check of the package would fail.
// @ts-expect-error `TOOLTIP_GAP` is internal, it must not be exported
export const leaked = ui.TOOLTIP_GAP; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
