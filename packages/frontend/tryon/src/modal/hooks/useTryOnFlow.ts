import { useEffect, useRef, useState } from 'react';

import { TRYON_MODE_MAP } from '../../constants/index.js';
import type { IEyeTryOnState } from '../../engine/categories/eye/index.js';
import type { IFaceTryOnState } from '../../engine/categories/face/index.js';
import type { IHairTryOnState } from '../../engine/categories/hair/index.js';
import type { ILipTryOnState } from '../../engine/categories/lip/index.js';
import type { INailTryOnState } from '../../engine/categories/nail/index.js';
import type { IMakeupState, ITryOnError, TTryOnMode } from '../../types/index.js';
import useTryOnUpload from './useTryOnUpload.js';

export interface ITryOnFlowState {
  // select: mode pick. instructions: mode-specific tips screen. tryon: engine mounted (with its
  // own loading overlay until camera/image is ready).
  step: 'select' | 'instructions' | 'tryon';
  mode: TTryOnMode;
  uploadedImageUrl: string | null;
  engineState:
    ILipTryOnState | IFaceTryOnState | IEyeTryOnState | IHairTryOnState | INailTryOnState | null;
  // The shade of the engine that was just taken away because the person chose another category or
  // another subcategory (selectable modal): the new engine starts with it, so what they are
  // comparing is the same shade on a different makeup. Only read while `engineState` is `null`
  // (the new engine has not told its own state yet); the engine's state wins from then on - a
  // shade that is taken away stays away. Nothing else (the range, the pattern) is carried: they
  // mean something only for the subcategory they were chosen for.
  carriedColor: string | null;
}

// `stageRef` below has to hold whichever category's stage is currently mounted - not the full
// `ITryOnStageRef<ILipTryOnState> | ITryOnStageRef<IFaceTryOnState>` union, though. That union
// fails wherever a `<XTryOnStage>` component's own single-category ref prop needs it:
// `setMakeupState`'s `type` field is contravariant per category (LIP's finishes aren't
// assignable where FACE's are expected, and vice versa), so a value valid for a *union* target
// isn't guaranteed valid for either concrete one alone. This narrower interface sidesteps that -
// it only declares what TryOnModal actually calls, with `setMakeupState` narrowed to exactly the
// fields ever passed there (`color`/`range`, never `type`). Every category's full
// `ITryOnStageRef<TState>` is still structurally assignable *to* this narrower shape (accepting
// `Partial<TState>` already covers accepting a plain `{color, range}`), so passing this as
// either stage's `ref` still type-checks correctly - only the reverse (using the narrow type
// somewhere a full one is required) wouldn't.
export interface ITryOnStageColorRangeRef {
  // `pattern` is EYE-only (see `IEyeTryOnState`) - optional here since LIP/FACE never pass it,
  // but declaring it lets this one shared ref type also cover the EYE branch below. A concrete
  // engine that doesn't know about `pattern` (LIP/FACE) just never receives it at runtime -
  // TryOnModal only ever calls `setMakeupState({ pattern })` from EYE-specific handlers.
  setMakeupState: (state: { color?: string | null; range?: number; pattern?: string }) => void;
  getState: () => IMakeupState;
  takeSnapshot: () => string | null;
  getStream: () => MediaStream | null;
  setComparePosition: (value: number | null) => void;
  getCanvas: () => HTMLCanvasElement;
}

const INITIAL_FLOW_STATE: ITryOnFlowState = {
  step: 'select',
  mode: TRYON_MODE_MAP.LIVE,
  uploadedImageUrl: null,
  engineState: null,
  carriedColor: null,
};

/**
 * Owns TryOnModal's own step/mode/image/engine-state orchestration - the `flow` state itself,
 * the handful of UI-only companion states that always get reset alongside it (`compareCanvas`,
 * `activeSheet`, `retryKey`), the two refs that reach into whichever stage is currently mounted
 * (`stageRef`/`cameraVideoRef`), and every handler that transitions between steps/modes/models.
 * Pulled out of TryOnModal itself purely to keep that file's own JSX-focused render logic
 * readable - every piece of state/every effect/every handler here behaves identically to when it
 * lived inline (same setState calls, same effect dependencies, same handler bodies), so this
 * changes nothing about when or how often TryOnModal re-renders.
 */
export default function useTryOnFlow(
  isOpen: boolean,
  // Told a photo that was turned down (see `useTryOnUpload`); without it the modal shows the reason.
  onUploadError?: (error: ITryOnError) => void,
) {
  const [flow, setFlow] = useState<ITryOnFlowState>(INITIAL_FLOW_STATE);
  // `null` = compare mode off; the actual canvas element = compare mode on. Its own truthiness
  // *is* "is compare active" - there used to be a separate `isCompareActive` boolean alongside
  // this, but the two had to be set together at every single call site anyway (nothing ever
  // needed them to disagree), which is exactly the kind of manually-synced duplicate state that
  // can drift out of sync by accident - the same class of bug `handleModelSelect` below had to
  // fix for `comparePosition` itself. One piece of state, nothing to forget to update.
  // Resolved in the toggle handler below (an event handler, not render - reading a ref's
  // `.current` during render itself is unsafe/lint-forbidden) - TryOnCompareSlider needs the
  // actual canvas element to account for its `object-fit` sizing.
  const [compareCanvas, setCompareCanvas] = useState<HTMLCanvasElement | null>(null);
  // Mobile/tablet only (below `lg:` - see the bottom action bar and ModalWrapper sizing in
  // TryOnModal) - the desktop sidebar's model list moves into this on-demand sheet instead of an
  // always-visible right column once the screen's too narrow for one. Mode itself doesn't need
  // a sheet - the bottom bar's mode button just toggles directly (see `handleModeToggle` below).
  const [activeSheet, setActiveSheet] = useState<'models' | null>(null);
  // Bumped only by the error overlay's "Retry" action (see `handleRetry` below) - passed as
  // `key` on the stage in TryOnModal, so changing it forces React to fully unmount+remount it.
  // That's deliberately heavier than calling some narrower "retry" method on the engine: a fresh
  // mount re-runs the exact same setup path that worked the first time (new engine,
  // `startTryOn()`, `startCamera()`/`loadImageUrl()`) for *any* of the ways that setup can fail -
  // camera permission, image decode, or the shared landmarker/texture load - without needing a
  // separate recovery method wired up per failure mode.
  const [retryKey, setRetryKey] = useState(0);

  const stageRef = useRef<ITryOnStageColorRangeRef>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  const {
    previewUrl,
    error: uploadError,
    setFile,
    reset: resetUpload,
    clearError: clearUploadError,
  } = useTryOnUpload(onUploadError);

  // Shared readiness check - drives both TryOnModal's not-ready overlay and disabling
  // shade/model selection until the stage can actually act on either.
  const isTryOnReady =
    flow.step === 'tryon' &&
    (flow.mode === TRYON_MODE_MAP.LIVE
      ? !!flow.engineState?.cameraReady
      : !!flow.uploadedImageUrl && !!flow.engineState?.imageReady);

  useEffect(() => {
    if (isOpen) return;

    /**
     * `TryOnModal` itself never unmounts (it's always rendered by the parent page), so the
     * flow has to be reset explicitly on close - otherwise the next open would resume
     * mid-flow.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlow(INITIAL_FLOW_STATE);
    setCompareCanvas(null);
    setActiveSheet(null);
    setRetryKey(0);
    resetUpload();
    clearUploadError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!previewUrl) return;

    // `uploadedImageUrl` is derived from `useTryOnUpload`'s blob preview URL, an external-system
    // side effect unsafe to run during render - same reasoning as AvatarUpload.tsx's identical
    // pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlow((prev) => ({ ...prev, uploadedImageUrl: previewUrl }));
  }, [previewUrl]);

  // Feeds the live camera's stream into the sidebar's small blurred preview - a second
  // <video> element showing the same MediaStream as the main stage (browsers support one
  // stream driving multiple <video> elements at once).
  useEffect(() => {
    if (flow.mode !== TRYON_MODE_MAP.LIVE || !flow.engineState?.cameraReady) return;

    const stream = stageRef.current?.getStream();
    if (stream && cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = stream;
    }
  }, [flow.mode, flow.engineState?.cameraReady]);

  // Step 1 -> 2: picking a mode always starts a fresh flow for it.
  const handleSelectMode = (mode: TTryOnMode) => {
    setFlow({ ...INITIAL_FLOW_STATE, step: 'instructions', mode });
    setCompareCanvas(null);
    setActiveSheet(null);
    clearUploadError();
  };

  // Step 2 -> 3/4 (live only) - the engine only mounts once we're in the 'tryon' step, and its
  // own status overlay covers the "waiting for camera" loading state from there.
  const handleStartLive = () => {
    setFlow((prev) => ({ ...prev, step: 'tryon' }));
  };

  // Step 2 -> 3/4 (upload only), passed to TryOnInstructions - which owns the file input/picker
  // trigger itself, since nothing else needs it - lands directly in 'tryon'; the upload stage's
  // own status overlay covers the "processing photo" loading state until `imageReady`. Only
  // advances on a file `setFile` actually accepted - staying on 'instructions' when it's
  // rejected (oversized, wrong type) leaves the engine unmounted rather than stuck forever on
  // its own loading overlay for an image that's never coming, with the rejection toast showing at
  // the same time (see `useTryOnUpload.setFile`'s comment).
  const handleFileSelected = (file: File) => {
    resetUpload();
    if (!setFile(file)) return;
    setFlow((prev) => ({ ...prev, step: 'tryon' }));
  };

  // Sidebar's mode-toggle, reachable from within the 'tryon' step - always resets back to that
  // mode's instructions screen, even re-clicking the already-active mode (matches the
  // reference's onCameraClick/onUploadClick; doubles as "start over"/"pick a different photo").
  const handleModeToggle = (mode: TTryOnMode) => {
    setFlow({ ...INITIAL_FLOW_STATE, step: 'instructions', mode });
    setCompareCanvas(null);
    setActiveSheet(null);
    clearUploadError();
  };

  const handleBackToSelect = () => {
    setFlow(INITIAL_FLOW_STATE);
    setCompareCanvas(null);
    setActiveSheet(null);
    clearUploadError();
  };

  // Selectable modal only: the person chose another category or subcategory. The stage of the old
  // one is replaced (TryOnModal keys it by the selection), so the engine state of the old engine is
  // dropped - the new engine tells its own - and only the shade goes over to it. The step, the mode
  // and the photo (or the camera, which the new engine asks for again) stay where they were.
  const handleSelectionChange = () => {
    setFlow((prev) => ({
      ...prev,
      engineState: null,
      carriedColor: prev.engineState ? prev.engineState.color : prev.carriedColor,
    }));
    setCompareCanvas(null);
    setActiveSheet(null);
  };

  const handleModelSelect = (url: string) => {
    resetUpload();
    setFlow((prev) => ({
      ...prev,
      mode: TRYON_MODE_MAP.UPLOAD,
      uploadedImageUrl: url,
      step: 'tryon',
    }));
    // If we were already in upload mode, `TryOnUploadStage` doesn't remount for a new photo -
    // the *same* engine instance just loads the new image (see its `imageUrl` effect), so its
    // own `comparePosition` field would otherwise carry over from before this switch. Clearing
    // `compareCanvas` alone only hides the React-level drag UI - it doesn't stop `renderFrame`
    // from still drawing the split/divider line on the canvas itself, so this has to explicitly
    // clear the engine's own state too (harmless no-op on the old engine if we were in live mode
    // instead, since that path gets a fresh, already-null one regardless).
    stageRef.current?.setComparePosition(null);
    setCompareCanvas(null);
    setActiveSheet(null);
  };

  // `hexColor` is `null` when re-clicking the already-active shade to deselect it - the engine's
  // `applyEffect` already treats `color: null` as "nothing to draw", so this alone is enough to
  // clear the makeup.
  const handleShadeSelect = (hexColor: string | null) => {
    stageRef.current?.setMakeupState({ color: hexColor });
  };

  // EYE-only (see TryOnPatternSwatches) - unlike shades, there's no deselect-to-null here, a
  // pattern-bearing finish always has *some* pattern applied once picked.
  const handlePatternSelect = (patternId: string) => {
    stageRef.current?.setMakeupState({ pattern: patternId });
  };

  // Top-control "Reset" action - clears the applied shade without re-opening the shade list,
  // same `color: null` semantics `handleShadeSelect` already uses for re-clicking the active
  // swatch to deselect it (the engine's `applyEffect` treats `color: null` as "nothing to draw").
  const handleResetMakeup = () => {
    stageRef.current?.setMakeupState({ color: null });
  };

  // Toggling on always (re)centers the split - toggling off clears it back to the normal
  // full render (`null`), matching `FaceLandmarkerEngineBase`'s own semantics for `comparePosition`.
  const handleCompareToggle = () => {
    setCompareCanvas((prev) => {
      const next = prev ? null : (stageRef.current?.getCanvas() ?? null);
      stageRef.current?.setComparePosition(next ? 0.5 : null);
      return next;
    });
  };

  // Wired to the not-ready overlay's "Retry" action (only shown once `flow.engineState?.error`
  // is actually set) - bumping `retryKey` remounts the stage fresh (see its own comment above).
  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

  const handleDownload = () => {
    const dataUrl = stageRef.current?.takeSnapshot();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'Try-On.png';
    link.click();
  };

  return {
    flow,
    setFlow,
    compareCanvas,
    activeSheet,
    setActiveSheet,
    retryKey,
    uploadError,
    stageRef,
    cameraVideoRef,
    isTryOnReady,
    handleSelectionChange,
    handleSelectMode,
    handleStartLive,
    handleFileSelected,
    handleModeToggle,
    handleBackToSelect,
    handleModelSelect,
    handleShadeSelect,
    handlePatternSelect,
    handleCompareToggle,
    handleRetry,
    handleDownload,
    handleResetMakeup,
  };
}
