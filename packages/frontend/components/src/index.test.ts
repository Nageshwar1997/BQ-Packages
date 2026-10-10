import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IButton, IClassName, IIconButton, ITextButton, ITooltip } from './index.js';
import * as root from './index.js';
import type {
  IUploadGroup,
  IUploadItem,
  IUploadItemHandle,
  IUploadsSummary,
  TToast,
  TToastItem,
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

  // A copy would not do: two copies of the toast store are two stores, and a toast shown through one
  // never reaches the `ToastContainer` that reads the other.
  it('gives the very same values from the root and from /ui and /toast, not copies', () => {
    const source: Record<string, unknown> = { ...ui, ...toast };

    for (const [name, value] of Object.entries(root)) {
      expect(value, name).toBe(source[name]);
    }
  });

  it('shows a toast added through the root in the store of /toast', () => {
    toast.useToastStore.setState({ toasts: [] });
    root.toaster.default({ title: 'From the root' });

    expect(toast.useToastStore.getState().toasts.map(({ type }) => type)).toEqual(['default']);
    toast.useToastStore.setState({ toasts: [] });
  });

  it('exports exactly these values from /ui', () => {
    expect(Object.keys(ui).sort()).toEqual(['Button', 'Tooltip']);
  });

  it('exports exactly these values from /toast', () => {
    expect(Object.keys(toast).sort()).toEqual([
      'TOAST_ICON_NAMES',
      'ToastContainer',
      'Toaster',
      'createUploadsToast',
      'getFormDataFiles',
      'getUploadItemFilesDone',
      'getUploadItemPercent',
      'getUploadsSummary',
      'isUploadItemSettled',
      'runUploadsInToast',
      'toaster',
      'useToastStore',
      'withProgressToast',
      'withUploadsToast',
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
  });
});

// If this type were exported, the next line would have no error: the comment would be reported as
// unused and the type check of the package would fail.
// @ts-expect-error `TOOLTIP_GAP` is internal, it must not be exported
export const leaked = ui.TOOLTIP_GAP; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
