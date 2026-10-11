import {
  createToaster,
  createToastStore,
  type TThemeStoreHook,
} from '@beautinique/frontend-stores';
import type { ReactNode } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';

import * as auth from './auth/index.js';
import type {
  IBadge,
  IButton,
  IClassName,
  IIconButton,
  IScrollToTop,
  ITextButton,
  ITheme,
  ITooltip,
  TDivider,
  TGradientTextType,
} from './index.js';
import * as root from './index.js';
import * as layout from './layout/index.js';
import type { TGradientPosition } from './linear-gradient/index.js';
import * as linearGradient from './linear-gradient/index.js';
import type { IResend } from './resend/index.js';
import * as resend from './resend/index.js';
import type { IStepper, IStepperStep } from './stepper/index.js';
import * as stepper from './stepper/index.js';
import * as theme from './theme/index.js';
import type {
  IDefaultToast,
  IToastContainer,
  IUploadItem,
  IUploadsSummary,
  TToast,
  TToastItem,
  TToastStore,
  TUploadItemStatus,
} from './toast/index.js';
import * as toast from './toast/index.js';
import * as ui from './ui/index.js';

// What the package gives to the apps, per import path. Nothing else may be reachable: an internal
// helper that leaks becomes a promise to keep it.
describe('the public API of the package', () => {
  it('exports from the root exactly what /ui, /layout, /theme and /toast export', () => {
    const names = new Set([
      ...Object.keys(ui),
      ...Object.keys(layout),
      ...Object.keys(theme),
      ...Object.keys(toast),
    ]);

    expect(Object.keys(root).sort()).toEqual([...names].sort());
  });

  // The root re-exports, it does not copy (see `tsup.config.ts` and `built-files.test.ts`).
  it('gives the very same values from the root and from its paths, not copies', () => {
    const source: Record<string, unknown> = { ...ui, ...layout, ...theme, ...toast };

    for (const [name, value] of Object.entries(root)) {
      expect(value, name).toBe(source[name]);
    }
  });

  // A component that few screens use has a path of its own and is not in the root (README).
  it('does not put in the root what has a path of its own', () => {
    const own = [
      ...Object.keys(auth),
      ...Object.keys(linearGradient),
      ...Object.keys(resend),
      ...Object.keys(stepper),
    ];

    expect(own.sort()).toEqual(['AuthBottomInstructions', 'LinearGradient', 'Resend', 'Stepper']);
    for (const name of own) expect(Object.keys(root), name).not.toContain(name);
  });

  // The store is the app's: it makes it with `createToastStore` and gets its toaster from
  // `createToaster`, both of `@beautinique/frontend-stores`. If this package made a store itself, or a
  // toaster that has one, and exported it, there would be two ways to get one.
  it('does not export a toast store, nor a toaster that has one of its own', () => {
    for (const name of [
      'useToastStore',
      'createToastStore',
      'createToaster',
      'toaster',
      'withProgressToast',
      'createUploadsToast',
      'withUploadsToast',
      'runUploadsInToast',
    ]) {
      expect(Object.keys(root), name).not.toContain(name);
      expect(Object.keys(toast), name).not.toContain(name);
    }
  });

  it('exports exactly these values from /ui', () => {
    expect(Object.keys(ui).sort()).toEqual([
      'Badge',
      'Button',
      'Divider',
      'GradientText',
      'Tooltip',
    ]);
  });

  it('exports exactly these values from the paths of one component each', () => {
    expect(Object.keys(layout)).toEqual(['ScrollToTop']);
    expect(Object.keys(theme)).toEqual(['Theme']);
    expect(Object.keys(linearGradient)).toEqual(['LinearGradient']);
    expect(Object.keys(stepper)).toEqual(['Stepper']);
    expect(Object.keys(resend)).toEqual(['Resend']);
    expect(Object.keys(auth)).toEqual(['AuthBottomInstructions']);
  });

  it('exports exactly these values from /toast', () => {
    expect(Object.keys(toast).sort()).toEqual([
      'TOAST_ICON_NAMES',
      'ToastContainer',
      'Toaster',
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
    expectTypeOf<IBadge['content']>().toEqualTypeOf<ReactNode>();
    expectTypeOf<TDivider>().toBeObject();
    expectTypeOf<TGradientTextType>().toEqualTypeOf<'accent' | 'silver'>();
    expectTypeOf<TGradientPosition>().toEqualTypeOf<'top' | 'bottom' | 'left' | 'right'>();
    expectTypeOf<IStepperStep['title']>().toBeString();
    expectTypeOf<IStepper['activeStep']>().toBeNumber();
    expectTypeOf<IResend['count']>().toBeNumber();
    expectTypeOf<IScrollToTop['pathname']>().toBeString();
    expectTypeOf<ITheme['store']>().toEqualTypeOf<TThemeStoreHook>();
    expectTypeOf<TToastItem>().toBeObject();
    expectTypeOf<TToast['type']>().toBeString();
    expectTypeOf<TUploadItemStatus>().toEqualTypeOf<
      'pending' | 'uploading' | 'success' | 'error'
    >();
    expectTypeOf<IUploadItem['status']>().toEqualTypeOf<TUploadItemStatus>();
    expectTypeOf<IUploadsSummary['percent']>().toBeNumber();
    expectTypeOf<IToastContainer['store']>().toEqualTypeOf<TToastStore>();
  });
});

// The app makes the store with the toasts of this package. The `@ts-expect-error` lines are checked
// by the type check of the package (`npm run typecheck`), not by vitest.
describe('the store of the app', () => {
  it('is made with the toasts of this package, and given to the container', () => {
    const useToastStore = createToastStore<TToast>();

    expectTypeOf(useToastStore).toEqualTypeOf<TToastStore>();
    expectTypeOf(root.ToastContainer).parameter(0).toEqualTypeOf<IToastContainer>();
  });

  it('gives the toaster of the stores package what each toast of this package is made of', () => {
    const { toaster } = createToaster(createToastStore<TToast>());

    expectTypeOf(toaster.success).parameter(0).toEqualTypeOf<Omit<IDefaultToast, 'type'>>();
    expectTypeOf(toaster.uploads.update)
      .parameter(2)
      .toEqualTypeOf<Partial<Omit<IUploadItem, 'id'>>>();
  });

  it('has to be a store of these toasts', () => {
    const other = createToastStore<{ type: 'other' }>();

    // only compiled by the type check, never run
    const check = () => {
      // @ts-expect-error a store of other toasts is not a toast store of this package
      root.ToastContainer({ store: other });
    };

    expect(check).toBeTypeOf('function');
  });
});

// If this type were exported, the next line would have no error: the comment would be reported as
// unused and the type check of the package would fail.
// @ts-expect-error `TOOLTIP_GAP` is internal, it must not be exported
export const leaked = ui.TOOLTIP_GAP; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
