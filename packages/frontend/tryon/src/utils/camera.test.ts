import { describe, expect, it } from 'vitest';

import { detectCameraPlatform, getCameraErrorMessage, type TCameraPlatform } from './camera.js';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1';
const IPHONE_INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0';
const IPAD_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36';
const DESKTOP_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MAC_SAFARI = IPAD_SAFARI;

const cameraError = (name: string) => new DOMException('camera failed', name);

describe('detectCameraPlatform', () => {
  it.each<[string, string, number, TCameraPlatform]>([
    ['iPhone Safari', IPHONE_SAFARI, 5, 'ios-safari'],
    ['iPhone Chrome', IPHONE_CHROME, 5, 'ios-other'],
    ['an in-app browser on iPhone', IPHONE_INSTAGRAM, 5, 'in-app'],
    ['iPad Safari (reports as a Mac, has a touch screen)', IPAD_SAFARI, 5, 'ios-safari'],
    ['Android Chrome', ANDROID_CHROME, 5, 'android'],
    ['an Android WebView', ANDROID_WEBVIEW, 5, 'in-app'],
    ['desktop Chrome', DESKTOP_CHROME, 0, 'desktop'],
    ['Safari on a real Mac (no touch screen)', MAC_SAFARI, 0, 'desktop'],
  ])('recognises %s', (_label, userAgent, touchPoints, expected) => {
    expect(detectCameraPlatform(userAgent, touchPoints)).toBe(expected);
  });
});

describe('getCameraErrorMessage - requesting the camera', () => {
  it.each<[TCameraPlatform, RegExp]>([
    ['ios-safari', /aA/],
    ['ios-other', /Settings/],
    ['android', /lock icon/],
    ['desktop', /address bar/],
  ])('tells a %s user where to allow a blocked camera', (platform, hint) => {
    const message = getCameraErrorMessage(cameraError('NotAllowedError'), 'request', platform);

    expect(message.title).toBe('Camera access is blocked');
    expect(message.description).toMatch(hint);
  });

  it('sends an in-app browser user to a real browser instead of to settings', () => {
    const message = getCameraErrorMessage(cameraError('NotAllowedError'), 'request', 'in-app');

    expect(message.title).toBe('Open in your browser');
    expect(message.description).toMatch(/Safari or Chrome/);
  });

  it('treats the legacy PermissionDeniedError like NotAllowedError', () => {
    expect(
      getCameraErrorMessage(cameraError('PermissionDeniedError'), 'request', 'desktop'),
    ).toEqual(getCameraErrorMessage(cameraError('NotAllowedError'), 'request', 'desktop'));
  });

  it.each(['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError'])(
    'reports %s as no camera found',
    (name) => {
      expect(getCameraErrorMessage(cameraError(name), 'request', 'desktop').title).toBe(
        'No camera found',
      );
    },
  );

  it.each(['NotReadableError', 'TrackStartError'])('reports %s as a busy camera', (name) => {
    const message = getCameraErrorMessage(cameraError(name), 'request', 'desktop');

    expect(message.title).toBe('Camera is busy');
    expect(message.description).toMatch(/Another app/);
  });

  it('reports a browser-raised AbortError as a camera that did not start', () => {
    expect(getCameraErrorMessage(cameraError('AbortError'), 'request', 'desktop').title).toBe(
      "Camera didn't start",
    );
  });

  it('explains a SecurityError as a security block, except in an in-app browser', () => {
    expect(getCameraErrorMessage(cameraError('SecurityError'), 'request', 'desktop').title).toBe(
      'Camera blocked for security',
    );
    expect(getCameraErrorMessage(cameraError('SecurityError'), 'request', 'in-app').title).toBe(
      'Open in your browser',
    );
  });

  it('falls back to a generic message for an unknown or non-DOM error', () => {
    for (const err of [new Error('boom'), 'boom', null, undefined, { name: 42 }]) {
      expect(getCameraErrorMessage(err, 'request', 'desktop').title).toBe('Camera unavailable');
    }
  });

  it('matches errors by name, so a plain object from an older engine still works', () => {
    expect(getCameraErrorMessage({ name: 'NotFoundError' }, 'request', 'desktop').title).toBe(
      'No camera found',
    );
  });
});

describe('getCameraErrorMessage - starting the preview', () => {
  it('does not blame camera permission when only the autoplay was blocked', () => {
    const message = getCameraErrorMessage(cameraError('NotAllowedError'), 'playback', 'ios-safari');

    expect(message.title).toBe("Preview couldn't start");
    expect(message.description).not.toMatch(/aA|Settings|permission/i);
    expect(message.description).toMatch(/Retry/);
  });

  it('reports any other preview failure as a preview problem, not a camera one', () => {
    const message = getCameraErrorMessage(cameraError('NotSupportedError'), 'playback', 'desktop');

    expect(message.title).toBe("Preview couldn't start");
  });
});
