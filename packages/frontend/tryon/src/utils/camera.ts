import type { ITryOnError } from '../types/index.js';

// Turns "the camera didn't start" into something a shopper can act on. `getUserMedia` (and the
// `<video>.play()` after it) fail for very different reasons - denied permission, no camera, a camera
// another app holds, a blocked autoplay, an unsupported/insecure page - and the fix for each is
// different (and, for a denied permission, different per browser: iOS Safari buries it in the `aA`
// menu, Android/desktop Chrome in the address bar). One message for all of them sent people to
// settings that didn't apply to them.

export type TCameraPlatform = 'ios-safari' | 'ios-other' | 'android' | 'desktop' | 'in-app';

// `request`: asking for the camera (`getUserMedia`). `playback`: the camera was granted but starting
// the preview (`video.play()`) failed. Both can throw `NotAllowedError`, yet mean different things -
// a refused `play()` is a blocked autoplay, not a denied camera permission.
export type TCameraFailureStage = 'request' | 'playback';

// In-app browsers (social apps' built-in webviews) routinely block the camera outright, and nothing
// in the page's own settings can change that - the only fix is to open the page in a real browser.
// `; wv)` is Android's generic WebView marker.
const IN_APP_BROWSER_PATTERN =
  /Instagram|FBAN|FBAV|FB_IAB|Snapchat|MicroMessenger|TikTok|BytedanceWebview|LinkedInApp|Pinterest|; wv\)/;
// Chrome/Firefox/Edge/Opera on iOS - WebKit under the hood, but permission lives in the iPhone's own
// Settings app under that browser, not in Safari's `aA` menu.
const IOS_OTHER_BROWSER_PATTERN = /CriOS|FxiOS|EdgiOS|OPiOS/;

export const detectCameraPlatform = (
  userAgent: string = navigator.userAgent,
  maxTouchPoints: number = navigator.maxTouchPoints,
): TCameraPlatform => {
  if (IN_APP_BROWSER_PATTERN.test(userAgent)) return 'in-app';

  // iPadOS 13+ identifies itself as a Mac - only its touch screen tells it apart from one.
  const isIOS =
    /iPhone|iPad|iPod/.test(userAgent) || (userAgent.includes('Macintosh') && maxTouchPoints > 1);
  if (isIOS) return IOS_OTHER_BROWSER_PATTERN.test(userAgent) ? 'ios-other' : 'ios-safari';

  return userAgent.includes('Android') ? 'android' : 'desktop';
};

const PERMISSION_BLOCKED: Record<TCameraPlatform, ITryOnError> = {
  'ios-safari': {
    title: 'Camera access is blocked',
    description:
      'Tap aA in the address bar, open Website Settings, set Camera to Allow, then tap Retry.',
  },
  'ios-other': {
    title: 'Camera access is blocked',
    description:
      'Allow the camera when asked, or turn it on for this browser in your device Settings, then tap Retry.',
  },
  android: {
    title: 'Camera access is blocked',
    description:
      'Tap the lock icon in the address bar, allow Camera under Permissions, then tap Retry.',
  },
  desktop: {
    title: 'Camera access is blocked',
    description:
      'Click the camera or lock icon in the address bar, allow Camera for this site, then tap Retry.',
  },
  'in-app': {
    title: 'Open in your browser',
    description:
      "This app's built-in browser blocks the camera. Open this page in Safari or Chrome to use Live Try-On.",
  },
};

const GENERIC_FAILURE: ITryOnError = {
  title: 'Camera unavailable',
  description:
    'Something stopped the camera from starting. Tap Retry, or try with a photo instead.',
};

// `DOMException`s from `getUserMedia` are matched by `name` rather than `instanceof` - older
// engines hand back plain objects that still carry the standard name.
const getErrorName = (err: unknown): string =>
  typeof err === 'object' && err !== null && 'name' in err && typeof err.name === 'string'
    ? err.name
    : '';

/**
 * Non-null when the camera can't even be requested here - decided up front because there's nothing
 * to call (`navigator.mediaDevices` doesn't exist outside a secure context or in a very old
 * browser), and the reason to show differs from every real failure.
 */
export const getCameraSupportError = (): ITryOnError | null => {
  if (!window.isSecureContext) {
    return {
      title: 'Secure connection needed',
      description:
        'The camera only works on secure (https) pages. Open the https version of this site.',
    };
  }

  // Typed as always present by lib.dom, but missing at runtime in browsers too old for it.
  const mediaDevices = navigator.mediaDevices as MediaDevices | undefined;
  if (typeof mediaDevices?.getUserMedia !== 'function') {
    return {
      title: 'Camera not supported',
      description:
        "This browser can't use the camera. Update it or switch to Safari or Chrome - or try with a photo instead.",
    };
  }

  return null;
};

export const getCameraErrorMessage = (
  err: unknown,
  stage: TCameraFailureStage,
  platform: TCameraPlatform = detectCameraPlatform(),
): ITryOnError => {
  const name = getErrorName(err);

  if (stage === 'playback') {
    return {
      title: "Preview couldn't start",
      description:
        name === 'NotAllowedError'
          ? 'Your browser blocked the camera preview from starting by itself. Tap Retry to start it.'
          : "The camera is on, but its preview didn't load. Tap Retry to try again.",
    };
  }

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return PERMISSION_BLOCKED[platform];
    case 'SecurityError':
      return platform === 'in-app'
        ? PERMISSION_BLOCKED['in-app']
        : {
            title: 'Camera blocked for security',
            description:
              'Your browser blocked camera access on this page. Open the site directly in your browser (over https) and try again.',
          };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return {
        title: 'No camera found',
        description:
          "We couldn't find a front camera on this device. Connect one, or try with a photo instead.",
      };
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        title: 'Camera is busy',
        description:
          'Another app or browser tab may be using your camera. Close it, then tap Retry.',
      };
    case 'AbortError':
      return {
        title: "Camera didn't start",
        description: 'The camera stopped before it could start. Tap Retry to try again.',
      };
    default:
      return GENERIC_FAILURE;
  }
};
