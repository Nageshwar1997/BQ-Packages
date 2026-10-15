import type { ErrorData } from 'hls.js';

// What a browser answers to `canPlayType()` for HLS when it plays it itself (Safari, iOS).
const HLS_MIME = 'application/vnd.apple.mpegurl';

// A stream that has a fatal network or media error is tried again this many times before it is given
// up (the player of hls.js has already retried by itself before it calls a error fatal).
const MAX_RECOVERIES = 3;

/** Whether `src` is an HLS playlist (`.m3u8`, also with a query string such as a signed URL). */
export const isHlsSource = (src: string) => /\.m3u8(?:$|[?#])/i.test(src);

export interface IStreamOptions {
  /** Start playing as soon as the stream is ready. */
  autoPlay: boolean;
  /** Called when the stream cannot be played: the browser cannot do it, `hls.js` could not be loaded, or a fatal error. */
  onError?: (error: unknown) => void;
}

/**
 * Makes `video` play the HLS playlist `src`, and returns the function that stops it.
 *
 * A browser that plays HLS itself (Safari, iOS) is given the playlist as the `src` of the video.
 * For the others `hls.js` is loaded at this moment (`import()`): a page that never plays a stream
 * does not download it, and an app that never uses a stream does not need to have it installed.
 * Errors are not logged: they go to `onError`.
 */
export const attachStream = (
  video: HTMLVideoElement,
  src: string,
  { autoPlay, onError }: IStreamOptions,
) => {
  let isCancelled = false;
  let destroyPlayer: (() => void) | undefined;

  const play = () => {
    // a browser may refuse to start a video by itself: that is not an error of the stream
    if (autoPlay) video.play().catch(() => undefined);
  };

  if (video.canPlayType(HLS_MIME) !== '') {
    video.src = src;
    video.addEventListener('loadedmetadata', play, { once: true });

    return () => {
      video.removeEventListener('loadedmetadata', play);
    };
  }

  import('hls.js')
    .then(({ default: Hls }) => {
      if (isCancelled) return;

      if (!Hls.isSupported()) {
        onError?.(new Error('This browser cannot play HLS video.'));

        return;
      }

      const player = new Hls();
      let recoveries = 0;

      destroyPlayer = () => {
        player.destroy();
      };

      player.on(Hls.Events.MANIFEST_PARSED, play);
      player.on(Hls.Events.ERROR, (_event: string, data: ErrorData) => {
        if (!data.fatal) return;

        if (recoveries < MAX_RECOVERIES && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          recoveries += 1;
          player.startLoad();
        } else if (recoveries < MAX_RECOVERIES && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          recoveries += 1;
          player.recoverMediaError();
        } else {
          player.destroy();
          destroyPlayer = undefined;
          onError?.(data);
        }
      });
      player.loadSource(src);
      player.attachMedia(video);
    })
    .catch((error: unknown) => {
      if (!isCancelled) onError?.(error);
    });

  return () => {
    isCancelled = true;
    destroyPlayer?.();
  };
};
