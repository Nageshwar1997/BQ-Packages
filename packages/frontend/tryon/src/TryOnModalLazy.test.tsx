// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TRY_ON_CATEGORY_MAP, TRY_ON_SUB_CATEGORY_MAP } from '@beautinique/frontend-constants';
import { installResizeObserver, required } from './test-utils/dom.js';
import { mount, unmountAll } from './test-utils/react.js';
import { TRYON_DIALOG_CLASS_NAME, TRYON_DIALOG_CONTAINER_PROPS } from './tryOnDialog.js';
import { TryOnModal } from './TryOnModalLazy.js';

// The modal of the `/modal` entry is replaced by a small one, and the moment it is loaded is held by the
// test: what is looked at is what the root does around it (when it loads it, what it shows meanwhile,
// what it gives it).
const loading = vi.hoisted(() => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const received: Record<string, unknown>[] = [];

  return {
    gate,
    release: () => {
      release();
    },
    received,
    loaded: vi.fn(),
  };
});

vi.mock('./modal/index.js', async () => {
  await loading.gate;
  loading.loaded();

  return {
    TryOnModal: (props: Record<string, unknown>) => {
      loading.received.push(props);

      return <div data-testid="loaded-modal">{String(props.isOpen)}</div>;
    },
  };
});

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const modal = (isOpen: boolean, extra: Record<string, unknown> = {}) => (
  <TryOnModal
    isOpen={isOpen}
    onClose={vi.fn()}
    tryOn={{ category: TRY_ON_CATEGORY_MAP.LIP, subCategory: TRY_ON_SUB_CATEGORY_MAP.MATTE }}
    shades={[]}
    {...extra}
  />
);

describe('TryOnModal of the root', () => {
  beforeEach(() => {
    installResizeObserver();
    window.innerHeight = 900;
    loading.received.length = 0;
  });

  afterEach(() => {
    unmountAll();
    document.body.replaceChildren();
  });

  it('costs the page nothing until it is opened: it renders nothing, and does not load the modal', async () => {
    const view = mount(modal(false));

    await flush();

    expect(view.container.innerHTML).toBe('');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(loading.loaded).not.toHaveBeenCalled();
  });

  it('shows a loading dialog, named Try-On, that can be closed, while the modal is being loaded, and then the modal', async () => {
    const onClose = vi.fn();
    const view = mount(modal(true, { onClose }));

    const dialog = required(document.querySelector('[role="dialog"]'), 'the loading dialog');

    expect(document.body.textContent).toContain('Try-On');
    expect(document.body.textContent).toContain('Loading Try-On');
    expect(document.querySelector('[data-testid="loaded-modal"]')).toBeNull();

    // As big as the modal that is coming: it is sized by the same classes (`tryOnDialog.ts`), so the
    // dialog does not jump from a small one to a full one when the engines arrive. (The lazy component
    // is cached after the first load, so this is looked at here and not in a test of its own.)
    expect(dialog.className).toContain(TRYON_DIALOG_CLASS_NAME);
    expect(required(dialog.parentElement, 'its backdrop').className).toContain(
      String(TRYON_DIALOG_CONTAINER_PROPS.className),
    );

    // a person who changed their mind while it loads is not stuck: the loading dialog can be closed
    act(() => {
      document.querySelector<HTMLButtonElement>('button[aria-label="Close"]')?.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    loading.release();
    await flush();

    expect(document.querySelector('[data-testid="loaded-modal"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Loading Try-On');
    expect(loading.loaded).toHaveBeenCalledTimes(1);

    view.unmount();
  });

  it('gives the loaded modal exactly the props it was given', async () => {
    const onClose = vi.fn();
    const assets = { baseUrl: '/tryon-assets/' };

    mount(modal(true, { onClose, assets, selectable: true }));
    loading.release();
    await flush();

    expect(loading.received.at(-1)).toMatchObject({
      isOpen: true,
      onClose,
      assets,
      selectable: true,
      tryOn: { category: TRY_ON_CATEGORY_MAP.LIP, subCategory: TRY_ON_SUB_CATEGORY_MAP.MATTE },
      shades: [],
    });
  });

  it('keeps the modal mounted once it was opened, so what it keeps (the models, the camera permission) is not lost', async () => {
    const view = mount(modal(true));

    loading.release();
    await flush();

    view.rerender(modal(false));

    expect(document.querySelector('[data-testid="loaded-modal"]')?.textContent).toBe('false');
  });

  it('opens when the page opens it later: it is loaded at that moment', async () => {
    const view = mount(modal(false));

    await flush();
    expect(document.querySelector('[data-testid="loaded-modal"]')).toBeNull();

    view.rerender(modal(true));
    loading.release();
    await flush();

    expect(document.querySelector('[data-testid="loaded-modal"]')?.textContent).toBe('true');
  });
});
