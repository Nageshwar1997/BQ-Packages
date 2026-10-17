import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/*
 * A stand-in for the stage of a category (the camera or the photo, and the engine behind it) for the
 * tests of the modal: it does what the modal can see of a real one - it is mounted with the props the
 * modal gives, it tells its state when it is ready, and it changes its state when it is asked to - and
 * nothing of MediaPipe. What it is given is recorded, so a test can say which stage was made, how many
 * times, and from what.
 */

export interface IFakeStageProps {
  mode: string;
  uploadedImageUrl: string | null;
  initialState?: Record<string, unknown>;
  onStateChange: (state: Record<string, unknown>) => void;
}

export interface IFakeStageMount {
  category: string;
  mode: string;
  uploadedImageUrl: string | null;
  initialState: Record<string, unknown>;
}

/** Every stage that was mounted, in order, and how many were taken away again. */
export const fakeStages = {
  mounts: [] as IFakeStageMount[],
  unmounts: 0,
  /** The photo the stage mounted now was last given (it can come after the stage is mounted). */
  photo: null as string | null,
  /** The calls of `setMakeupState` the modal made on the stage that is mounted now. */
  makeupCalls: [] as Record<string, unknown>[],
  reset() {
    this.mounts.length = 0;
    this.unmounts = 0;
    this.photo = null;
    this.makeupCalls.length = 0;
  },
};

export const createFakeStage = (category: string) =>
  forwardRef<unknown, IFakeStageProps>(function FakeStage(
    { mode, uploadedImageUrl, initialState = {}, onStateChange },
    ref,
  ) {
    const state = useRef<Record<string, unknown>>({});
    const canvas = useRef<HTMLCanvasElement | null>(null);
    const notify = useRef(onStateChange);

    notify.current = onStateChange;

    useImperativeHandle(
      ref,
      () => ({
        setMakeupState: (partial: Record<string, unknown>) => {
          fakeStages.makeupCalls.push(partial);
          state.current = { ...state.current, ...partial };
          notify.current(state.current);
        },
        getState: () => state.current,
        takeSnapshot: () => 'data:image/png;base64,FAKE',
        getStream: () => null,
        setComparePosition: () => undefined,
        getCanvas: () => (canvas.current ??= document.createElement('canvas')),
      }),
      [],
    );

    useEffect(() => {
      fakeStages.photo = uploadedImageUrl;
    }, [uploadedImageUrl]);

    useEffect(() => {
      fakeStages.mounts.push({ category, mode, uploadedImageUrl, initialState });

      // the engine is made, and tells its state: ready to try on, with what it was started from
      state.current = {
        type: initialState.type ?? null,
        color: initialState.color ?? null,
        range: initialState.range ?? 0.5,
        ...(initialState.pattern === undefined ? {} : { pattern: initialState.pattern }),
        cameraReady: mode === 'LIVE',
        imageReady: mode === 'UPLOAD',
        tryOnStarted: true,
        detectionStatus: 'detected',
      };
      notify.current(state.current);

      return () => {
        fakeStages.unmounts += 1;
      };
      // like the real stage: set up once per mount
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div data-testid="stage" data-category={category} data-type={String(initialState.type)} />
    );
  });
