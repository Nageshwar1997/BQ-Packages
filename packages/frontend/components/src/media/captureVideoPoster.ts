export interface ICapturePosterOptions {
  /** The second of the video to take the picture at. @default 0 */
  time?: number;
  /** The widest the picture gets, in pixels: a bigger frame is made smaller. @default 640 */
  maxWidth?: number;
  /** How long to wait for the video, in milliseconds. @default 10000 */
  timeout?: number;
  /** Stops the work (the video is dropped and the answer is `undefined`). */
  signal?: AbortSignal;
}

// A seek to the second the video is already at does not fire `seeked`, so the first frame is asked
// for a moment after the start.
const MIN_TIME = 0.05;

/**
 * A picture (a `data:` URL) of a frame of a video file, to show where the video would be before it
 * plays. It resolves to `undefined` when there is no picture to give: the video fails to load, is
 * not allowed to be read (a video from another site needs `Access-Control-Allow-Origin`), takes too
 * long, or the work was stopped. It never rejects.
 *
 * It cannot read a stream (`.m3u8`): ask the server for a poster for those.
 */
export const captureVideoPoster = (
  src: string,
  { time = 0, maxWidth = 640, timeout = 10_000, signal }: ICapturePosterOptions = {},
) =>
  new Promise<string | undefined>((resolve) => {
    if (signal?.aborted) {
      resolve(undefined);

      return;
    }

    const video = document.createElement('video');
    let isDone = false;

    const finish = (poster?: string) => {
      if (isDone) return;

      isDone = true;
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      video.removeAttribute('src');
      video.load();
      resolve(poster);
    };
    const abort = () => {
      finish();
    };
    const timer = window.setTimeout(abort, timeout);

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    video.addEventListener(
      'loadeddata',
      () => {
        video.currentTime = Math.max(time, MIN_TIME);
      },
      { once: true },
    );
    video.addEventListener(
      'seeked',
      () => {
        if (isDone) return;

        try {
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            finish();

            return;
          }

          const scale = Math.min(1, maxWidth / video.videoWidth);
          const canvas = document.createElement('canvas');

          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);

          const context = canvas.getContext('2d');

          if (!context) {
            finish();

            return;
          }

          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          finish(canvas.toDataURL('image/jpeg', 0.8));
        } catch {
          // a canvas that was touched by a video of another origin refuses to be read
          finish();
        }
      },
      { once: true },
    );
    video.addEventListener('error', abort, { once: true });
    signal?.addEventListener('abort', abort, { once: true });

    video.src = src;
  });
