// @vitest-environment jsdom
import { act, Activity } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import {
  BACK_ONLINE_TOAST_MS,
  type INetworkToaster,
  NetworkStatusToaster,
  type TNetworkStatus,
} from './NetworkStatusToaster.js';

// A toaster that remembers what is on screen, as the real one does.
const makeToaster = () => {
  let counter = 0;
  const shown = new Map<string, { kind: string; data: Record<string, unknown> }>();
  const add = (kind: string) => (data: Record<string, unknown>) => {
    counter += 1;
    const id = `toast-${String(counter)}`;

    shown.set(id, { kind, data });

    return id;
  };
  const toaster = {
    success: vi.fn(add('success')),
    warning: vi.fn(add('warning')),
    loading: vi.fn(add('loading')),
    remove: vi.fn((id: string) => {
      shown.delete(id);
    }),
  } satisfies INetworkToaster;

  return { toaster, shown, titles: () => [...shown.values()].map((toast) => toast.data.title) };
};

describe('NetworkStatusToaster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    unmountAll();
    vi.useRealTimers();
  });

  const setup = (status: TNetworkStatus) => {
    const kit = makeToaster();
    const view = mount(<NetworkStatusToaster status={status} toaster={kit.toaster} />);
    const change = (next: TNetworkStatus) => {
      view.rerender(<NetworkStatusToaster status={next} toaster={kit.toaster} />);
    };

    return { ...kit, view, change };
  };

  it('draws nothing', () => {
    const { view } = setup('online');

    expect(view.container.innerHTML).toBe('');
  });

  it('shows nothing while the user is online all along', () => {
    const { toaster, titles } = setup('online');

    expect(titles()).toEqual([]);
    expect(toaster.success).not.toHaveBeenCalled();
  });

  describe('when the internet goes away', () => {
    it('shows "You\'re offline" at once when it starts offline, which stays and cannot be closed', () => {
      const { toaster, titles } = setup('offline');

      expect(titles()).toEqual(["You're offline"]);
      expect(toaster.warning.mock.calls[0]?.[0]).toMatchObject({
        autoClose: false,
        isClosable: false,
      });
    });

    it('shows it once the status changes to offline', () => {
      const { change, titles } = setup('online');

      change('offline');

      expect(titles()).toEqual(["You're offline"]);
    });

    it('shows "Connecting to internet..." while the network is back but nothing has answered', () => {
      const { change, titles, toaster } = setup('offline');

      change('connecting');

      expect(titles()).toEqual(['Connecting to internet...']);
      expect(toaster.warning).toHaveBeenCalledTimes(1);
      expect(toaster.loading).toHaveBeenCalledTimes(1);
    });

    it('shows one toast at a time: each takes the place of the one before', () => {
      const { change, titles } = setup('online');
      const seen: unknown[][] = [];

      for (const status of ['offline', 'connecting', 'offline', 'connecting'] as const) {
        change(status);
        seen.push(titles());
      }

      expect(seen.map((list) => list.length)).toEqual([1, 1, 1, 1]);
    });
  });

  describe('when it is back', () => {
    it('keeps "Back online" for three seconds', () => {
      expect(BACK_ONLINE_TOAST_MS).toBe(3000);
    });

    it('shows "Back online", which goes away by itself after a little while', () => {
      const { change, titles, toaster } = setup('offline');

      change('online');

      expect(titles()).toEqual(['Back online']);
      expect(toaster.success.mock.calls[0]?.[0]).toMatchObject({
        closeTimer: BACK_ONLINE_TOAST_MS,
      });
    });

    it('takes the toast of the trouble away', () => {
      const { change, shown } = setup('offline');
      const offlineToast = [...shown.keys()].at(0);

      change('online');

      expect(shown.has(offlineToast ?? '')).toBe(false);
    });

    it('does not show "Back online" again when the user stays online', () => {
      const { change, toaster } = setup('offline');

      change('online');
      act(() => {
        vi.advanceTimersByTime(BACK_ONLINE_TOAST_MS + 1000);
      });
      change('online');

      expect(toaster.success).toHaveBeenCalledTimes(1);
    });

    it('shows "Back online" when the trouble comes back before the first one has had its time', () => {
      const { change, toaster } = setup('offline');

      change('online');
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      change('offline');
      act(() => {
        vi.advanceTimersByTime(BACK_ONLINE_TOAST_MS);
      });
      change('online');

      expect(toaster.success).toHaveBeenCalledTimes(2);
    });

    it('shows "Back online" for each time the trouble was over', () => {
      const { change, toaster } = setup('offline');

      change('online');
      act(() => {
        vi.advanceTimersByTime(BACK_ONLINE_TOAST_MS + 100);
      });
      change('offline');
      change('online');

      expect(toaster.success).toHaveBeenCalledTimes(2);
    });

    it('takes "Back online" away when the trouble starts again', () => {
      const { change, titles } = setup('offline');

      change('online');
      change('offline');

      expect(titles()).toEqual(["You're offline"]);
    });
  });

  describe('in React', () => {
    it('takes its toast away when it is removed', () => {
      const { view, titles } = setup('offline');

      view.unmount();

      expect(titles()).toEqual([]);
    });

    it('is the same in StrictMode, which runs its effects twice: one toast stays', () => {
      const kit = makeToaster();
      mount(<NetworkStatusToaster status="offline" toaster={kit.toaster} />, { strict: true });

      expect(kit.titles()).toEqual(["You're offline"]);
    });

    it('shows "Back online" in StrictMode too', () => {
      const kit = makeToaster();
      const view = mount(<NetworkStatusToaster status="offline" toaster={kit.toaster} />, {
        strict: true,
      });

      view.rerender(<NetworkStatusToaster status="online" toaster={kit.toaster} />);

      expect(kit.titles()).toEqual(['Back online']);
    });

    it('does not start again when it is given another toaster object with the same status', () => {
      const kit = makeToaster();
      const view = mount(<NetworkStatusToaster status="offline" toaster={kit.toaster} />);

      view.rerender(<NetworkStatusToaster status="offline" toaster={{ ...kit.toaster }} />);

      expect(kit.toaster.warning).toHaveBeenCalledTimes(1);
      expect(kit.toaster.remove).not.toHaveBeenCalled();
    });

    it('does not show "Back online" again when its effects run again without a change (an <Activity> shown again)', () => {
      const kit = makeToaster();
      const element = (mode: 'visible' | 'hidden', status: TNetworkStatus) => (
        <Activity mode={mode}>
          <NetworkStatusToaster status={status} toaster={kit.toaster} />
        </Activity>
      );
      const view = mount(element('visible', 'offline'));

      view.rerender(element('visible', 'online'));
      act(() => {
        vi.advanceTimersByTime(BACK_ONLINE_TOAST_MS + 100);
      });
      expect(kit.toaster.success).toHaveBeenCalledTimes(1);

      view.rerender(element('hidden', 'online'));
      view.rerender(element('visible', 'online'));

      expect(kit.toaster.success).toHaveBeenCalledTimes(1);
    });

    it('uses the toaster it has now for the next toast, and the one that made a toast to take it away', () => {
      const first = makeToaster();
      const second = makeToaster();
      const view = mount(<NetworkStatusToaster status="offline" toaster={first.toaster} />);

      view.rerender(<NetworkStatusToaster status="online" toaster={second.toaster} />);

      expect(second.titles()).toEqual(['Back online']);
      expect(first.toaster.success).not.toHaveBeenCalled();
      expect(first.toaster.remove).toHaveBeenCalledTimes(1);
      expect(first.titles()).toEqual([]);
    });

    it('uses the toaster it has now to take its toast away', () => {
      const first = makeToaster();
      const second = makeToaster();
      const view = mount(<NetworkStatusToaster status="offline" toaster={first.toaster} />);

      view.rerender(<NetworkStatusToaster status="offline" toaster={second.toaster} />);
      view.unmount();

      // the toast was made by the first toaster, and the first one removes it (the one it was shown on)
      expect(first.toaster.remove).toHaveBeenCalledTimes(1);
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without a status or a toaster, or with a status that does not exist', () => {
    const check = () => {
      const { toaster } = makeToaster();

      // @ts-expect-error it has to know how the connection is
      <NetworkStatusToaster toaster={toaster} />;
      // @ts-expect-error and has to be given a toaster: the package has none
      <NetworkStatusToaster status="online" />;
      // @ts-expect-error the statuses are online, offline and connecting
      <NetworkStatusToaster status="slow" toaster={toaster} />;
    };

    expect(check).toBeTypeOf('function');
  });
});
