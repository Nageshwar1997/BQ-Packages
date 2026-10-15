import { useEffect, useRef } from 'react';

/** How the connection is: `'connecting'` is back on the network but nothing has answered yet. */
export type TNetworkStatus = 'online' | 'offline' | 'connecting';

/**
 * The part of the toaster of `@beautinique/frontend-stores` (`createToaster`) that this uses. The
 * toaster is the app's: it is given in, this package has none.
 */
export interface INetworkToaster {
  success: (data: { title: string; description?: string; closeTimer?: number }) => string;
  warning: (data: {
    title: string;
    description?: string;
    autoClose?: boolean;
    isClosable?: boolean;
  }) => string;
  loading: (data: { title: string; description?: string }) => string;
  remove: (toastId: string) => void;
}

export interface INetworkStatusToaster {
  /** The state of the connection, e.g. `useOnlineStatus().status` of `@beautinique/frontend-hooks`. */
  status: TNetworkStatus;
  toaster: INetworkToaster;
}

/** How long "Back online" stays on screen. Offline and connecting stay until the status changes. */
export const BACK_ONLINE_TOAST_MS = 3000;

/**
 * Tells the user when the internet goes away and when it comes back, with one toast at a time:
 * "You're offline" (stays), then "Connecting to internet..." (stays) once the network is back but
 * nothing has answered yet, then "Back online" (goes away by itself). Nothing is shown while the user
 * simply is online. It draws nothing itself.
 */
export const NetworkStatusToaster = ({ status, toaster }: INetworkStatusToaster) => {
  // Set when the connection gets into trouble and cleared once "Back online" has had its time: that
  // is what tells "online again" from "online all along".
  const hadTroubleRef = useRef(false);
  const toasterRef = useRef(toaster);

  useEffect(() => {
    toasterRef.current = toaster;
  });

  useEffect(() => {
    const current = toasterRef.current;

    if (status === 'online') {
      if (!hadTroubleRef.current) return;

      const toastId = current.success({
        title: 'Back online',
        description: "You're connected to the internet again.",
        closeTimer: BACK_ONLINE_TOAST_MS,
      });

      // Not cleared right away: React runs an effect twice in development, and the second run has to
      // show the toast again. It is cleared once the toast has had its time, so that an effect that
      // runs again without a change (Fast Refresh, or a hidden `<Activity>` shown again) does not.
      const timer = window.setTimeout(() => {
        hadTroubleRef.current = false;
      }, BACK_ONLINE_TOAST_MS);

      return () => {
        window.clearTimeout(timer);
        current.remove(toastId);
      };
    }

    hadTroubleRef.current = true;

    const toastId =
      status === 'offline'
        ? current.warning({
            title: "You're offline",
            description: "Check your internet connection. We'll reconnect when it's back.",
            autoClose: false,
            isClosable: false,
          })
        : current.loading({
            title: 'Connecting to internet...',
            description: "Hang tight, we're getting you back online.",
          });

    return () => {
      current.remove(toastId);
    };
  }, [status]);

  return null;
};
