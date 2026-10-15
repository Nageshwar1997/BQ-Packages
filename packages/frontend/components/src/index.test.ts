import {
  createToaster,
  createToastStore,
  type TThemeStoreHook,
} from '@beautinique/frontend-stores';
import type { ReactNode } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';

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
import type { TGradientPosition } from './linear-gradient/index.js';
import type { IResend } from './resend/index.js';
import type { IStepper, IStepperStep } from './stepper/index.js';
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
import * as ui from './ui/index.js';

// The values each path gives are pinned in `api.test.ts`; these are the types.
describe('the public API of the package', () => {
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
