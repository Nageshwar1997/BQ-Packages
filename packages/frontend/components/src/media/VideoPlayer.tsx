import { type Ref, useEffect, useMemo, useRef, useState, type VideoHTMLAttributes } from 'react';

import { mergeRefs } from '../lib/mergeRefs.js';
import type { IClassName } from '../types/component.js';
import { captureVideoPoster } from './captureVideoPoster.js';
import { attachStream, isHlsSource } from './streaming.js';

// A grey picture with a play triangle, for when a video has no poster (yet).
const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#9ca3af"/><path d="M6.5 3v3l3-1.5z" fill="#fff"/></svg>',
)}`;

export interface IVideoPlayer extends IClassName {
  /**
   * The attributes of the `<video>`, `src` included. Unless told otherwise the video plays by itself,
   * muted and without controls, does not loop, and plays inline on a phone.
   * The `className` here is the video's; the one of the player is on its box.
   */
  videoProps: VideoHTMLAttributes<HTMLVideoElement>;
  /** The `<video>` itself (not set while only the poster is shown). */
  ref?: Ref<HTMLVideoElement>;
  /** Show the picture of the video instead of playing it, e.g. for a thumbnail. */
  showPosterOnly?: boolean;
  /**
   * Makes the picture for a video that has no `poster`, when only the poster is shown. Give it to
   * ask a service (an image of the first second that a CDN makes); it can answer at once or later.
   * Without it a frame of the file is taken in the browser (`captureVideoPoster`), which does not
   * work for a stream (`.m3u8`).
   */
  getPoster?: (
    src: string,
    signal: AbortSignal,
  ) => Promise<string | undefined> | string | undefined;
  /** The picture shown until a poster is there, or when there can be none. */
  placeholder?: string;
  /** The alternative text of the poster. It is empty because it is usually a thumbnail inside a button that has its own name. @default '' */
  posterAlt?: string;
  /** Called when a stream (`.m3u8`) cannot be played. */
  onStreamError?: (error: unknown) => void;
}

const defaultGetPoster = (src: string, signal: AbortSignal) =>
  isHlsSource(src) ? undefined : captureVideoPoster(src, { signal });

/**
 * A video, with what an app needs around the plain `<video>`: it plays an HLS stream (`.m3u8`)
 * in the browsers that cannot do it themselves (`hls.js` is loaded then, and only then; install it
 * if you play streams), and it can show only the poster of a video, made from the file when none
 * is given.
 *
 * The video is taken out and put in again when its `src` changes.
 */
export const VideoPlayer = ({
  className = '',
  videoProps,
  ref,
  showPosterOnly = false,
  getPoster,
  placeholder = PLACEHOLDER,
  posterAlt = '',
  onStreamError,
}: IVideoPlayer) => {
  const { src, poster: givenPoster, autoPlay = true } = videoProps;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const getPosterRef = useRef(getPoster);
  const onStreamErrorRef = useRef(onStreamError);
  const [made, setMade] = useState<{ src: string; poster: string } | null>(null);

  // The newest functions are used by the work below without starting it again.
  useEffect(() => {
    getPosterRef.current = getPoster;
    onStreamErrorRef.current = onStreamError;
  });

  const mergedRef = useMemo(() => mergeRefs<HTMLVideoElement>(videoRef, ref), [ref]);
  const needsPoster = showPosterOnly && !!src && !givenPoster;
  const isHls = !!src && isHlsSource(src);

  useEffect(() => {
    if (!needsPoster || !src) return;

    const controller = new AbortController();

    Promise.resolve((getPosterRef.current ?? defaultGetPoster)(src, controller.signal))
      .then((poster) => {
        if (poster && !controller.signal.aborted) setMade({ src, poster });
      })
      .catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [needsPoster, src]);

  useEffect(() => {
    const video = videoRef.current;

    if (showPosterOnly || !isHls || !video || !src) return;

    return attachStream(video, src, {
      autoPlay,
      onError: (error) => {
        onStreamErrorRef.current?.(error);
      },
    });
  }, [showPosterOnly, isHls, src, autoPlay]);

  const poster = givenPoster ?? (made !== null && made.src === src ? made.poster : undefined);
  const mediaClassName = `aspect-auto h-full w-full object-cover ${videoProps.className ?? ''}`;

  return (
    <div className={`h-full w-full ${className}`}>
      {showPosterOnly ? (
        <img src={poster ?? placeholder} alt={posterAlt} className={mediaClassName} />
      ) : (
        <video
          key={src}
          ref={mergedRef}
          {...videoProps}
          // a stream is given to the video by `attachStream`: the plain attribute would make a
          // browser that cannot play it fail before the player starts
          src={isHls ? undefined : src}
          playsInline={videoProps.playsInline ?? true}
          autoPlay={autoPlay}
          muted={videoProps.muted ?? true}
          loop={videoProps.loop ?? false}
          controls={videoProps.controls ?? false}
          className={mediaClassName}
        />
      )}
    </div>
  );
};
