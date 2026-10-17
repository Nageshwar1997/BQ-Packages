import type { ReactElement, Ref } from 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type {
  IEngineOptions,
  IMakeupState,
  ITryOnLiveEngineRef,
  ITryOnStageRef,
} from '../types/index.js';
import { useTryOnAssets } from './TryOnAssetsContext.js';

export type TLiveEngineClass<TState extends IMakeupState> = new (
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement,
  initialState?: Partial<TState>,
  options?: IEngineOptions,
) => ITryOnLiveEngineRef<TState>;

export interface ITryOnLiveStageProps<TState extends IMakeupState> {
  EngineClass: TLiveEngineClass<TState>;
  initialState?: Partial<TState>;
  onStateChange: (state: TState) => void;
}

// Category-agnostic: just the camera + rendered canvas - no picker UI. `TryOnModal` drives
// shade/finish via the forwarded ref (only the trimmed `ITryOnStageRef` surface) and renders its
// own overlays around this. Each category only differs by the engine class it passes in.
function TryOnLiveStageInner<TState extends IMakeupState>(
  { EngineClass, initialState, onStateChange }: ITryOnLiveStageProps<TState>,
  ref: Ref<ITryOnStageRef<TState>>,
) {
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<ITryOnLiveEngineRef<TState> | null>(null);
  const assets = useTryOnAssets();

  useImperativeHandle(
    ref,
    () => ({
      // Every method reads `engineRef.current` fresh on each call (not captured once here) -
      // the engine instance itself is only created later, in the effect below, so this handle
      // has to stay lazy about it rather than closing over a snapshot.
      setMakeupState: (state) => engineRef.current?.setMakeupState(state),
      getState: () => engineRef.current?.getState(),
      takeSnapshot: () => engineRef.current?.takeSnapshot() ?? null,
      getStream: () => engineRef.current?.getStream() ?? null,
      setComparePosition: (value) => engineRef.current?.setComparePosition(value),
      getCanvas: () => engineRef.current?.getCanvas() ?? null,
    }),
    [],
  );

  useEffect(() => {
    const canvas1 = canvas1Ref.current;
    const canvas2 = canvas2Ref.current;
    const video = videoRef.current;
    if (!canvas1 || !canvas2 || !video) return;

    const engine = new EngineClass(canvas1, canvas2, initialState, { assets });
    engineRef.current = engine;

    const unsubscribe = engine.onChange(onStateChange);
    onStateChange(engine.getState());

    engine.attachVideo(video);
    void engine.startTryOn();
    void engine.startCamera();

    return () => {
      unsubscribe();
      engine.destroy();
      engineRef.current = null;
    };
    // Set up once per mount - `TryOnModal` remounts this component (via `key` or conditional
    // rendering) rather than expecting it to react to prop changes mid-life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative size-full">
      <canvas ref={canvas1Ref} className="absolute inset-0 z-0 size-full! object-cover" />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 z-0 size-full scale-x-[-1] object-cover"
      />
      {/* Opaque - fully covers the raw video above with the mirrored, makeup-composited frame */}
      <canvas ref={canvas2Ref} className="absolute inset-0 z-1 size-full! object-cover" />
    </div>
  );
}

// `forwardRef` erases generics - this cast restores them so callers get `TState` inferred.
const TryOnLiveStage = forwardRef(TryOnLiveStageInner) as <TState extends IMakeupState>(
  props: ITryOnLiveStageProps<TState> & { ref?: Ref<ITryOnStageRef<TState>> },
) => ReactElement;

export default TryOnLiveStage;
