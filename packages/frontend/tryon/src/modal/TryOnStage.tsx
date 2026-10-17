import type { ReactElement, Ref } from 'react';
import { forwardRef, useImperativeHandle, useRef } from 'react';

import { TRYON_MODE_MAP } from '../constants/index.js';
import type { IMakeupState, ITryOnStageRef, TTryOnMode } from '../types/index.js';

import type { TLiveEngineClass } from './TryOnLiveStage.js';
import TryOnLiveStage from './TryOnLiveStage.js';
import type { TUploadEngineClass } from './TryOnUploadStage.js';
import TryOnUploadStage from './TryOnUploadStage.js';

export interface ITryOnEngines<TState extends IMakeupState> {
  Live: TLiveEngineClass<TState>;
  Upload: TUploadEngineClass<TState>;
}

export interface ITryOnStageProps<TState extends IMakeupState> {
  engines: ITryOnEngines<TState>;
  mode: TTryOnMode;
  uploadedImageUrl: string | null;
  initialState?: Partial<TState>;
  onStateChange: (state: TState) => void;
}

// Mounts whichever of the live/upload stage matches `mode`, and forwards its ref straight
// through - both expose the identical `ITryOnStageRef` shape, so the parent (`TryOnModal`) never
// needs to know which mode is active to set a shade or take a snapshot. Category-agnostic -
// each category's `<Category>TryOnStage` just binds its own engine pair to this.
function TryOnStageInner<TState extends IMakeupState>(
  { engines, mode, uploadedImageUrl, initialState, onStateChange }: ITryOnStageProps<TState>,
  ref: Ref<ITryOnStageRef<TState>>,
) {
  const liveRef = useRef<ITryOnStageRef<TState> | null>(null);
  const uploadRef = useRef<ITryOnStageRef<TState> | null>(null);

  useImperativeHandle(
    ref,
    () => {
      const getActiveRef = () =>
        mode === TRYON_MODE_MAP.LIVE ? liveRef.current : uploadRef.current;

      return {
        setMakeupState: (state) => getActiveRef()?.setMakeupState(state),
        getState: () => getActiveRef()?.getState(),
        takeSnapshot: () => getActiveRef()?.takeSnapshot() ?? null,
        getStream: () => getActiveRef()?.getStream() ?? null,
        setComparePosition: (value) => getActiveRef()?.setComparePosition(value),
        getCanvas: () => getActiveRef()?.getCanvas() ?? null,
      };
    },
    // Rebuilt when `mode` changes so callers always reach the currently-mounted stage.
    [mode],
  );

  return mode === TRYON_MODE_MAP.LIVE ? (
    <TryOnLiveStage
      ref={liveRef}
      EngineClass={engines.Live}
      initialState={initialState}
      onStateChange={onStateChange}
    />
  ) : (
    <TryOnUploadStage
      ref={uploadRef}
      EngineClass={engines.Upload}
      imageUrl={uploadedImageUrl}
      initialState={initialState}
      onStateChange={onStateChange}
    />
  );
}

// `forwardRef` erases generics - this cast restores them so callers get `TState` inferred.
const TryOnStage = forwardRef(TryOnStageInner) as <TState extends IMakeupState>(
  props: ITryOnStageProps<TState> & { ref?: Ref<ITryOnStageRef<TState>> },
) => ReactElement;

export default TryOnStage;
