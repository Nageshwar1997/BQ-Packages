import { ModalWrapper } from '@beautinique/frontend-components';
import type { TTryOnSelection } from '@beautinique/frontend-types';
import { Icon } from '@iconify/react';
import { type Ref, useEffect, useRef, useState } from 'react';

import type { IEyeTryOnState } from '../engine/categories/eye/index.js';
import type { IFaceTryOnState } from '../engine/categories/face/index.js';
import type { IHairTryOnState } from '../engine/categories/hair/index.js';
import type { ILipTryOnState } from '../engine/categories/lip/index.js';
import type { INailTryOnState } from '../engine/categories/nail/index.js';
import { getTryOnShades, TRYON_CATEGORY_OPTIONS, TRYON_MODE_MAP } from '../constants/index.js';
import { EYE_DEFAULT_PATTERNS, EYE_PATTERNS, EYE_RANGE_BOUNDS } from '../constants/eye.js';
import { FACE_RANGE_BOUNDS } from '../constants/face.js';
import { HAIR_RANGE_BOUNDS } from '../constants/hair.js';
import { LIP_RANGE_BOUNDS } from '../constants/lip.js';
import { NAIL_RANGE_BOUNDS } from '../constants/nail.js';
import useDebouncedDetectionStatus from './hooks/useDebouncedDetectionStatus.js';
import useFullscreen from './hooks/useFullscreen.js';
import useTryOnFlow from './hooks/useTryOnFlow.js';
import { registerTryOnIcons } from '../icons/try-on-icons.js';
import type { ITryOnAssets } from '../types/assets.js';
import type { IShade, ITryOnError, ITryOnStageRef, TDetectionStatus } from '../types/index.js';

import BottomButtons from './BottomButtons.js';
import EyeTryOnStage from './eye/EyeTryOnStage.js';
import FaceTryOnStage from './face/FaceTryOnStage.js';
import HairTryOnStage from './hair/HairTryOnStage.js';
import LipTryOnStage from './lip/LipTryOnStage.js';
import NailTryOnStage from './nail/NailTryOnStage.js';
import { TryOnAssetsProvider } from './TryOnAssetsContext.js';
import TryOnBottomSheet from './TryOnBottomSheet.js';
import TryOnCompareSlider from './TryOnCompareSlider.js';
import TryOnDock from './TryOnDock.js';
import TryOnInstructions from './TryOnInstructions.js';
import TryOnModelList from './TryOnModelList.js';
import TryOnModeSelect from './TryOnModeSelect.js';
import TryOnOverlay from './TryOnOverlay.js';
import TryOnPatternSwatches from './TryOnPatternSwatches.js';
import TryOnRangeSlider from './TryOnRangeSlider.js';
import TryOnSelectableFrame from './TryOnSelectableFrame.js';
import TryOnShadeSwatches from './TryOnShadeSwatches.js';
import TryOnSidebar from './TryOnSidebar.js';
import TryOnTopControls from './TryOnTopControls.js';

export interface ITryOnModalProps {
  isOpen: boolean;
  /**
   * Called when the modal asks to be closed (the cross, Escape, a press on the backdrop, and
   * "Cancel" and "Apply" of a selectable modal).
   */
  onClose: () => void;
  /**
   * The category and subcategory that are tried on - what the product has (`product.tryOn`). For a
   * shopper it is fixed; with `selectable` it is where the modal starts.
   */
  tryOn?: TTryOnSelection;
  /**
   * The shades the person can try - the real colour variants of the product (`product.variants` of
   * the type `Color`), never invented with a colour picker. When a `selectable` modal gets none
   * (the product has no variants yet), it offers the shades of the chosen subcategory.
   */
  shades: IShade[];
  /** Where the models and the images are. Without it they come from the CDN. */
  assets?: ITryOnAssets;
  /**
   * Called with a photo that was turned down (too big, not an image). Without it the modal shows the
   * reason where the photo is chosen; give it to show a toast of your own instead.
   */
  onUploadError?: (error: ITryOnError) => void;
  /**
   * The person can change the category and the subcategory while the modal is open, to see which
   * fits - for whoever sets up a product. What they chose is given to `onApply` only when they press
   * "Apply"; closing the modal any other way changes nothing. The modal knows no roles: the app
   * decides who gets it.
   * @default false
   */
  selectable?: boolean;
  /** `selectable` only: called with the selection when "Apply" is pressed, just before `onClose`. */
  onApply?: (selection: TTryOnSelection) => void;
}

const TryOnModal = ({
  isOpen,
  onClose,
  tryOn: givenTryOn,
  shades: givenShades,
  assets,
  onUploadError,
  selectable = false,
  onApply,
}: ITryOnModalProps) => {
  registerTryOnIcons();

  // What a selectable modal has chosen so far (`null`: nothing yet, so it is still the one it was
  // given). It starts from `tryOn` each time the modal is opened, and is only given back by "Apply".
  const [chosen, setChosen] = useState<TTryOnSelection | null>(null);
  const tryOn = selectable ? (chosen ?? givenTryOn) : givenTryOn;

  useEffect(() => {
    if (isOpen) return;

    // The modal stays mounted when it is closed, so what was chosen has to be let go of by hand:
    // the next time it opens it starts again from what the app has.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChosen(null);
  }, [isOpen]);

  // The shades of the product; a product that has none yet is tried with the ones of the
  // subcategory (only in the selectable modal: a shopper is shown what the product really has).
  const shades =
    selectable && tryOn && givenShades.length === 0
      ? getTryOnShades(tryOn.category, tryOn.subCategory)
      : givenShades;

  // Owns step/mode/image/engine-state, the UI-only companion states reset alongside it
  // (compareCanvas/activeSheet/retryKey), the stage/camera-video refs, and every handler that
  // transitions between steps/modes/models - see useTryOnFlow.ts's own comment for why this lives
  // in its own hook. Same state/effects/handler bodies as before this was pulled out, so this
  // changes nothing about when or how often this component re-renders.
  const {
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
  } = useTryOnFlow(isOpen, onUploadError);

  // Selectable modal: another category/subcategory was chosen. `chosen` is what the stage below is
  // made from; the flow lets go of the engine state of the old stage (see `handleSelectionChange`).
  const handleSelect = (next: TTryOnSelection) => {
    setChosen(next);
    handleSelectionChange();
  };

  // Part of the key of the stage: a new selection mounts a new engine (the category's own stage
  // component is another one, and a subcategory is read by an engine only when it is made).
  const stageKey = `${String(retryKey)}:${tryOn?.category ?? ''}:${tryOn?.subCategory ?? ''}`;

  const handleApply = () => {
    if (!tryOn) return;

    onApply?.(tryOn);
    onClose();
  };

  // Fullscreen targets the whole stage panel (not just the canvas), so the toolbar, context chip
  // and dock all come along - hiding the dock (its own handle) then gives a clean, full-size view.
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    isSupported: canFullscreen,
    isFullscreen,
    toggle: handleFullscreenToggle,
  } = useFullscreen(panelRef);

  // Gated on `isTryOnReady`, not read unconditionally - `cameraReady`/`imageReady` and the
  // engine's own `detectionStatus` field (`IMakeupBaseState`, every category's engine base reuses
  // it, repurposed to mean "face detected"/"hair mask detected"/"hand detected" depending on the
  // category, see `HandLandmarkerEngineBase`/`HairSegmenterEngineBase`'s own comments) becoming
  // correct don't land in the same state update (the engine's own `getInitialState` default,
  // `'not-in-frame'`, is what `flow.engineState.detectionStatus` holds the instant
  // `cameraReady`/`imageReady` first flips true - the *real* reading from an actual renderFrame
  // pass only arrives in a following update). Reading the raw value unconditionally here would
  // prime `useDebouncedDetectionStatus`'s own internal debounce with that stale default the moment
  // the stage became ready, which - since 'not-in-frame' is falsy-different-from-'detected' -
  // could flash the detection-guide TryOnOverlay on for that one render before the real reading
  // corrects it a moment later. Forcing this to stay `undefined` until `isTryOnReady` is true
  // sidesteps that: the first value it can ever take on is whatever the *next* real update
  // reports, never the engine's un-started default.
  const rawDetectionStatus = isTryOnReady ? flow.engineState?.detectionStatus : undefined;
  const debouncedDetectionStatus = useDebouncedDetectionStatus(rawDetectionStatus);

  // Reads the *debounced* signal (already gated on `isTryOnReady` at the source, see
  // `rawDetectionStatus` above), not the raw per-frame one, so this and the detection-guide
  // TryOnOverlay's visibility never disagree. Reused below both to show that overlay and to keep
  // shade/compare/download actions disabled while it's showing - applying a shade with nothing
  // reliably detected (face, hair, or hand, depending on the category) doesn't do anything useful.
  const detectionStatus = isTryOnReady ? debouncedDetectionStatus : undefined;
  const canInteract = isTryOnReady && detectionStatus === 'detected';

  // Copy for the not-ready overlay below (TryOnOverlay - the very same component the
  // detection-status guide further down uses) - split out here since it's a 2x2 matrix (loading/
  // error x live/upload), too much for the JSX to carry inline. `notReadyError` set is exactly
  // when this used to switch from a spinner to an error card, so the icon/title mirror that
  // same split. An error always carries its own title and description (see `ITryOnError`), so only
  // the loading copy is per-mode.
  const notReadyError = flow.engineState?.error;
  const notReadyIcon = notReadyError
    ? 'solar:danger-triangle-linear'
    : flow.mode === TRYON_MODE_MAP.LIVE
      ? 'solar:videocamera-record-linear'
      : 'solar:gallery-add-linear';
  const notReadyTitle =
    notReadyError?.title ??
    (flow.mode === TRYON_MODE_MAP.LIVE
      ? 'Waiting for camera permission...'
      : 'Processing photo...');
  const notReadyDescription = notReadyError?.description ?? 'This should only take a moment.';

  // `detectionStatus` is one shared state field every category's engine reuses (see
  // `HandLandmarkerEngineBase`/`HairSegmenterEngineBase`'s own comments), but what it's actually
  // reporting differs by what that category tracks: LIP/FACE/EYE track a real face, HAIR tracks
  // `getHairDetectionStatus`'s hair mask, NAIL tracks `getHandDetectionStatus`'s hand landmarks.
  // The overlay copy has to match *that*, not always say "face" - a shopper doing a NAIL try-on
  // who moves their hand out of frame was seeing "Face not in frame", which doesn't match
  // anything on screen for them to fix.
  const trackedSubjectCopy =
    tryOn?.category === 'HAIR'
      ? { subject: 'hair', possessive: 'your hair' }
      : tryOn?.category === 'NAIL'
        ? { subject: 'hand', possessive: 'your whole hand' }
        : { subject: 'face', possessive: 'your whole face' };

  // 'turned' now reaches three categories with two different real-world meanings: FACE's and
  // EYE's own "head angled too far to one side" (`FaceEngineBase.refineDetectionStatus`/
  // `EyeEngineBase.refineDetectionStatus` - EYE tracks the same face mesh, added in a later
  // robustness pass after FACE's own), and NAIL's "a hand is in frame but not facing the camera
  // nail-side-up" (`getHandDetectionStatus`, utils/tryon-utils/nail.ts - reusing this status
  // rather than inventing a new one, since it's exactly the same "in frame, just not correctly
  // oriented" situation). Without this, a shopper who tilted their hand palm-out or edge-on got
  // zero nails painted with no on-screen explanation at all - the hand itself still counted as
  // "detected" (`hands.length > 0`), so the guide overlay never showed anything. HAIR/LIP never
  // produce 'turned' - this entry is unreachable there, same as 'not-clear' below, but still needs
  // to type-check against something.
  const turnedCopy =
    tryOn?.category === 'NAIL'
      ? {
          // Same icon NAIL's own upload/live instructions already use for this exact tip
          // (`NAIL_UPLOAD_INSTRUCTIONS`/`NAIL_LIVE_INSTRUCTIONS`, constants/tryon-constants/nail.ts)
          // - consistent iconography for the same underlying guidance.
          icon: 'solar:hand-stars-linear',
          title: 'Hand turned the wrong way',
          description:
            'Show the back of your hand to the camera - your nails need to be visible, not your palm.',
        }
      : {
          // Same icon as the "facing the camera directly" instruction-screen tip
          // (FACE_UPLOAD_INSTRUCTIONS/FACE_LIVE_INSTRUCTIONS) - deliberately not 'not-in-frame's
          // scanner icon, even though both guide the shopper toward a better frame, since this one
          // reads as its own distinct situation (in frame, just angled) rather than another flavor
          // of "not in frame at all".
          icon: 'solar:face-scan-circle-linear',
          title: 'Face turned too much',
          description: 'Face the camera directly - a slight turn is fine, just not a big one.',
        };

  // Copy for the detection-guide overlay below, keyed by every non-'detected' `TDetectionStatus`
  // value - a `Record` (not another inline ternary chain like `notReadyIcon` above) specifically
  // so TS forces a new entry here the moment a category ever adds another status value, instead
  // of that new case silently falling through to the wrong copy. 'not-clear' only ever actually
  // shows for FACE (see `FaceEngineBase.refineDetectionStatus`) - it stays face-specific
  // (unreachable for HAIR/NAIL, but the `Record` still needs every key filled in). 'not-in-frame'
  // is the one status every category can actually hit, so it's the one that needs to read
  // correctly for all of them.
  const DETECTION_GUIDE_COPY: Record<
    Exclude<TDetectionStatus, 'detected'>,
    { icon: string; title: string; description: string }
  > = {
    'not-in-frame': {
      icon: 'solar:scanner-linear',
      title: `${trackedSubjectCopy.subject} not in frame`,
      description: `Move so ${trackedSubjectCopy.possessive} is inside the frame.`,
    },
    'not-clear': {
      icon: 'solar:danger-triangle-linear',
      title: 'Face not clearly visible',
      description: "Move closer, and make sure there's good, even lighting.",
    },
    turned: turnedCopy,
  };

  // Only meaningful inside the supported-category branch below, but declared here (not
  // further down) to stay next to the other pre-render derived values. Each *finish* tunes its
  // own intensity-slider bounds now (see FACE_RANGE_BOUNDS/LIP_RANGE_BOUNDS's own per-finish
  // comments) - keyed by `tryOn.subCategory`, not just `tryOn.category`, since e.g. FOUNDATION
  // and BLUSH read very differently at the same raw alpha. The fallback below is never actually
  // reached by the UI (both real usages further down sit inside the branch that's already
  // confirmed `tryOn.category` is 'LIP' | 'FACE') - it exists purely so this stays a plain
  // object instead of `IRangeBounds | undefined`.
  const rangeBounds =
    tryOn?.category === 'FACE'
      ? FACE_RANGE_BOUNDS[tryOn.subCategory]
      : tryOn?.category === 'LIP'
        ? LIP_RANGE_BOUNDS[tryOn.subCategory]
        : tryOn?.category === 'EYE'
          ? EYE_RANGE_BOUNDS[tryOn.subCategory]
          : tryOn?.category === 'HAIR'
            ? HAIR_RANGE_BOUNDS[tryOn.subCategory]
            : tryOn?.category === 'NAIL'
              ? NAIL_RANGE_BOUNDS[tryOn.subCategory]
              : { min: 0, max: 1, default: 0.5 };

  // Only meaningful inside the EYE branch below, same "declared up top, next to rangeBounds"
  // reasoning - `undefined` for any EYE subcategory without a pattern picker yet (see
  // EYE_PATTERNS's own comment), which the render below already treats as "don't show the row".
  const eyePatterns = tryOn?.category === 'EYE' ? EYE_PATTERNS[tryOn.subCategory] : undefined;

  // Feeds the context chip over the canvas ("Lipstick - Live") - same category icon the `/tryons`
  // browse page uses for that category, and the raw `SUB_CATEGORY` token made readable
  // (`LIP_GLOSS` -> "lip gloss", capitalized by CSS).
  const categoryIcon =
    TRYON_CATEGORY_OPTIONS.find(({ category }) => category === tryOn?.category)?.icon ??
    'solar:magic-stick-3-linear';
  const subCategoryLabel = tryOn?.subCategory.replaceAll('_', ' ').toLowerCase() ?? '';

  return (
    <TryOnAssetsProvider value={assets}>
      <ModalWrapper
        isOpen={isOpen}
        onClose={onClose}
        header={{ title: 'Try-On', showCloseIcon: true }}
        // Mobile/tablet: edge-to-edge, no backdrop margin - matches a native full-screen sheet.
        // `lg:` restores the original centered-dialog sizing exactly. Every one of these needs
        // `!` - ModalWrapper's own classes (`max-w-md rounded-xl border` etc.) can otherwise win
        // regardless of source order (`max-w-full` without `!` here once genuinely lost to the
        // component's own `max-w-md`, which - combined with `min-w-[80dvw]!` - clamped the whole
        // modal to exactly 80dvw even where `w-full!` should have taken it edge-to-edge instead,
        // since a conflicting `min-width` always wins over `max-width` regardless of importance).
        // `lg:w-auto!` un-forces the mobile `w-full!` back on large screens - width there is
        // meant to be driven by `min-w-[80dvw]` as a floor (content can still grow past it), not
        // pinned to 100% of the backdrop's padded space, which `w-full!` alone would do.
        containerProps={{ className: 'p-0! lg:p-8!' }}
        className="h-full max-h-full! w-full! max-w-full! min-w-[80dvw]! rounded-none! border-0! lg:max-h-[90dvh]! lg:w-auto! lg:rounded-xl! lg:border!"
      >
        <TryOnSelectableFrame
          enabled={selectable}
          selection={tryOn}
          onSelect={handleSelect}
          onCancel={onClose}
          onApply={handleApply}
        >
          {/* Only LIP, FACE, EYE, HAIR, and NAIL have a rendering engine built so far - see
          docs/tryons/TRYON.md. The discriminant check stays inline (not a separately-computed
          boolean) so TS keeps narrowing `tryOn` to `{category: 'LIP' | 'FACE' | 'EYE' | 'HAIR' |
          'NAIL', ...}` for every access inside the branch below - a plain boolean variable would
          lose that link. `TTryOnCategory` only has these same 5 members today, so both this
          exclusion chain and the `tryOn` check just below it are provably unreachable *right now*
          - TS narrows `tryOn` to `never` in that branch, which is exactly why both need an
          explicit disable rather than being simplified away: the moment a 6th category lands in
          `@beautinique/shared-constants` before this app's own code catches up, this is the
          fallback that's supposed to catch it, not dead weight to delete. */}
          {!tryOn ||
          (tryOn.category !== 'LIP' &&
            tryOn.category !== 'FACE' &&
            tryOn.category !== 'EYE' &&
            tryOn.category !== 'HAIR' &&
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            tryOn.category !== 'NAIL') ? (
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 p-8 text-center">
              <span className="bg-primary/5 flex size-14 items-center justify-center rounded-2xl">
                <Icon icon="solar:hourglass-linear" className="text-primary/50 size-7" />
              </span>
              <p className="text-primary text-base font-semibold">
                {
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  tryOn
                    ? 'Coming soon'
                    : selectable
                      ? 'Choose what to try on'
                      : 'Try-On not available'
                }
              </p>
              <p className="text-tertiary text-sm">
                {
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  tryOn
                    ? `Try-on for ${(tryOn as TTryOnSelection).category} is coming soon.`
                    : selectable
                      ? 'Choose a category and a subcategory above to start.'
                      : 'This product has no Try-On configured yet.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* The sidebar (mode-toggle + model list) is always visible on `lg:` and up, on every
              step - only the left panel's content swaps between select/instructions/the actual
              canvas. `w-fit` (`ModalWrapper`'s scrollable content wrapper default, for its usual
              centered-dialog content) can't size a `flex-1` panel with no intrinsic width of its
              own (its children are all absolutely-positioned), so the row would collapse to just
              the sidebar's width without an explicit size here - `min-w-[80dvw]!` on ModalWrapper
              sidesteps that. Below `lg:` this stacks into a column instead - the sidebar's own
              content moves into the bottom sheets further down, so there's nothing to fit here. */}
              <div className="flex h-full w-full flex-col gap-3 lg:flex-row lg:gap-4">
                {/* The stage panel. Select/instructions get a faint brand wash at the top (the canvas
              step doesn't - it's fully covered by the camera/photo anyway). */}
                <div
                  ref={panelRef}
                  className={`border-primary/10 bg-secondary-invert relative min-h-0 flex-1 overflow-hidden shadow-sm ${
                    isFullscreen ? 'rounded-none border-0' : 'rounded-3xl border'
                  } ${flow.step === 'tryon' ? '' : 'from-blue-crayola-c/10 bg-linear-to-b to-transparent'}`}
                >
                  {flow.step === 'select' ? (
                    <TryOnModeSelect onSelect={handleSelectMode} />
                  ) : flow.step === 'instructions' ? (
                    <TryOnInstructions
                      mode={flow.mode}
                      category={tryOn.category}
                      onStartLive={handleStartLive}
                      onFileSelected={handleFileSelected}
                      onBack={handleBackToSelect}
                      uploadError={uploadError}
                    />
                  ) : (
                    <>
                      {tryOn.category === 'LIP' ? (
                        <LipTryOnStage
                          key={stageKey}
                          // `stageRef` is deliberately typed narrower than `ITryOnStageRef<TState>`
                          // (see its own comment) - TS can't verify a shared ref object is safe
                          // across two different categories' full ref shapes (its `RefObject.current`
                          // is mutable, so it wants exact bidirectional compatibility, which two
                          // *different* concrete `TState`s structurally can't give it), even though
                          // it genuinely is: every method this file actually calls through it stays
                          // within the narrower shape, and whichever stage is mounted still assigns
                          // its own full, correct ref object into `.current` regardless of this cast.
                          ref={stageRef as Ref<ITryOnStageRef<ILipTryOnState>>}
                          mode={flow.mode}
                          uploadedImageUrl={flow.uploadedImageUrl}
                          initialState={{
                            type: tryOn.subCategory,
                            color: flow.engineState ? flow.engineState.color : flow.carriedColor,
                            // Persists the intensity slider's position across Live<->Upload toggles
                            // too, same reasoning as `color` above - falls back to the engine's own
                            // default rather than `undefined` (which would win the spread in
                            // getInitialState()).
                            range: flow.engineState?.range ?? rangeBounds.default,
                          }}
                          onStateChange={(engineState) => {
                            setFlow((prev) => ({ ...prev, engineState }));
                          }}
                        />
                      ) : tryOn.category === 'EYE' ? (
                        <EyeTryOnStage
                          key={stageKey}
                          // See the matching cast comment on <LipTryOnStage> above.
                          ref={stageRef as Ref<ITryOnStageRef<IEyeTryOnState>>}
                          mode={flow.mode}
                          uploadedImageUrl={flow.uploadedImageUrl}
                          initialState={{
                            type: tryOn.subCategory,
                            color: flow.engineState ? flow.engineState.color : flow.carriedColor,
                            range: flow.engineState?.range ?? rangeBounds.default,
                            // Persists the pattern picker's position across Live<->Upload toggles
                            // too, same reasoning as `color`/`range` above - `IEyeTryOnState` only
                            // (LIP/FACE's `flow.engineState` can never have a `pattern` field, so this
                            // reads `undefined` there rather than a type error). Falls back to this
                            // *subCategory's own* default pattern, not `EyeEngineBase.getInitialState()`'s
                            // placeholder - an object-spread key set to `undefined` still overrides
                            // the base value it's spread onto (`{...getInitialState(), pattern:
                            // undefined}` really does end up `undefined`, it doesn't fall through to
                            // the base), and since EYELINER/KAJAL use separate pattern-id namespaces,
                            // only a lookup keyed by the actual subCategory gives the right one for
                            // both - a single fixed fallback would be wrong for whichever finish it
                            // wasn't written for.
                            pattern:
                              (flow.engineState as IEyeTryOnState | null)?.pattern ??
                              EYE_DEFAULT_PATTERNS[tryOn.subCategory],
                          }}
                          onStateChange={(engineState) => {
                            setFlow((prev) => ({ ...prev, engineState }));
                          }}
                        />
                      ) : tryOn.category === 'HAIR' ? (
                        <HairTryOnStage
                          key={stageKey}
                          // See the matching cast comment on <LipTryOnStage> above.
                          ref={stageRef as Ref<ITryOnStageRef<IHairTryOnState>>}
                          mode={flow.mode}
                          uploadedImageUrl={flow.uploadedImageUrl}
                          initialState={{
                            type: tryOn.subCategory,
                            color: flow.engineState ? flow.engineState.color : flow.carriedColor,
                            range: flow.engineState?.range ?? rangeBounds.default,
                          }}
                          onStateChange={(engineState) => {
                            setFlow((prev) => ({ ...prev, engineState }));
                          }}
                        />
                      ) : tryOn.category === 'NAIL' ? (
                        <NailTryOnStage
                          key={stageKey}
                          // See the matching cast comment on <LipTryOnStage> above.
                          ref={stageRef as Ref<ITryOnStageRef<INailTryOnState>>}
                          mode={flow.mode}
                          uploadedImageUrl={flow.uploadedImageUrl}
                          initialState={{
                            type: tryOn.subCategory,
                            color: flow.engineState ? flow.engineState.color : flow.carriedColor,
                            range: flow.engineState?.range ?? rangeBounds.default,
                          }}
                          onStateChange={(engineState) => {
                            setFlow((prev) => ({ ...prev, engineState }));
                          }}
                        />
                      ) : (
                        <FaceTryOnStage
                          key={stageKey}
                          // See the matching cast comment on <LipTryOnStage> above.
                          ref={stageRef as Ref<ITryOnStageRef<IFaceTryOnState>>}
                          mode={flow.mode}
                          uploadedImageUrl={flow.uploadedImageUrl}
                          initialState={{
                            type: tryOn.subCategory,
                            color: flow.engineState ? flow.engineState.color : flow.carriedColor,
                            range: flow.engineState?.range ?? rangeBounds.default,
                          }}
                          onStateChange={(engineState) => {
                            setFlow((prev) => ({ ...prev, engineState }));
                          }}
                        />
                      )}

                      {/* Not-ready-yet overlay - each mode has its own readiness signal (camera
                    permission vs. image processing), rolled into `isTryOnReady` since only the
                    orchestrator knows which mode is active. */}
                      {!isTryOnReady && (
                        <TryOnOverlay
                          icon={notReadyIcon}
                          title={notReadyTitle}
                          description={notReadyDescription}
                          action={
                            notReadyError ? { label: 'Retry', onClick: handleRetry } : undefined
                          }
                        />
                      )}

                      {/* Continuously reactive (recomputed every renderFrame, not a one-time
                    setup gate like the overlay above) - covers the canvas again if the user
                    drifts out of frame or too far away mid-session, even after already having
                    been ready once. */}
                      {isTryOnReady && detectionStatus && detectionStatus !== 'detected' && (
                        <TryOnOverlay
                          icon={DETECTION_GUIDE_COPY[detectionStatus].icon}
                          title={DETECTION_GUIDE_COPY[detectionStatus].title}
                          description={DETECTION_GUIDE_COPY[detectionStatus].description}
                        />
                      )}

                      {canInteract && compareCanvas && (
                        <TryOnCompareSlider
                          canvas={compareCanvas}
                          onDrag={(value) => {
                            stageRef.current?.setComparePosition(value);
                          }}
                        />
                      )}

                      {/* Context chip - what's being tried on, and in which mode. Purely informational
                    (`pointer-events-none`, so it can never steal a drag from the compare surface
                    underneath it); `max-w` leaves room for the top-right toolbar on narrow screens. */}
                      <div className="pointer-events-none absolute top-3 left-3 z-5 flex max-w-[calc(100%-12.5rem)] items-center gap-2 rounded-full border border-white/15 bg-black/40 py-1.5 pr-3 pl-1.5 shadow-lg backdrop-blur-md sm:max-w-[calc(100%-14.5rem)]">
                        <span className="bg-accent-duo flex size-6 shrink-0 items-center justify-center rounded-full sm:size-7">
                          <Icon icon={categoryIcon} className="size-3.5 text-white sm:size-4" />
                        </span>
                        <span className="truncate text-xs font-medium text-white capitalize sm:text-sm">
                          {subCategoryLabel}
                        </span>
                        <span
                          aria-hidden
                          className="hidden size-1 shrink-0 rounded-full bg-white/40 sm:block"
                        />
                        <span className="hidden shrink-0 items-center gap-1.5 text-xs text-white/75 sm:flex">
                          {flow.mode === TRYON_MODE_MAP.LIVE && isTryOnReady && (
                            <span
                              aria-hidden
                              className="size-1.5 rounded-full bg-red-500 motion-safe:animate-pulse"
                            />
                          )}
                          {flow.mode === TRYON_MODE_MAP.LIVE ? 'Live' : 'Photo'}
                        </span>
                      </div>

                      {/* Above TryOnCompareSlider's full-canvas z-4 drag surface, so the toggle
                    itself (to turn compare back off) stays clickable while it's active. */}
                      <TryOnTopControls
                        compareProps={{
                          active: !!compareCanvas,
                          disabled: !canInteract || !flow.engineState?.color,
                          onClick: handleCompareToggle,
                        }}
                        resetProps={{
                          disabled: !canInteract || !flow.engineState?.color,
                          onClick: handleResetMakeup,
                        }}
                        downloadProps={{
                          disabled: !canInteract || !flow.engineState?.color || !!compareCanvas,
                          onClick: handleDownload,
                        }}
                        // Not rendered at all where the browser can't fullscreen an element. Stays
                        // enabled while already fullscreen, so there's always a way back out even if
                        // readiness drops (e.g. the camera errors) mid-session.
                        fullscreenProps={
                          canFullscreen
                            ? {
                                active: isFullscreen,
                                disabled: !isTryOnReady && !isFullscreen,
                                onClick: handleFullscreenToggle,
                              }
                            : undefined
                        }
                      />

                      {/* Hidden while comparing - it would otherwise sit on top of the drag surface
                    and fight it for clicks, and isn't meaningful mid-comparison. Otherwise the
                    shopper can collapse it with its own handle (open by default). */}
                      <TryOnDock
                        hidden={!!compareCanvas}
                        appliedColor={flow.engineState?.color ?? null}
                      >
                        {/* Intensity slider - only meaningful once a shade is actually applied. */}
                        {flow.engineState?.color && (
                          <TryOnRangeSlider
                            value={flow.engineState.range}
                            min={rangeBounds.min}
                            max={rangeBounds.max}
                            color={flow.engineState.color}
                            disabled={!canInteract}
                            onChange={(value) => {
                              stageRef.current?.setMakeupState({ range: value });
                            }}
                          />
                        )}

                        <TryOnShadeSwatches
                          className="w-full"
                          shades={shades}
                          appliedColor={flow.engineState?.color ?? null}
                          onSelect={handleShadeSelect}
                          disabled={!canInteract}
                        />

                        {/* EYE-only, same "only meaningful once a shade is applied" gate as the
                      intensity slider above - and only for a subCategory that actually has a
                      pattern list (see EYE_PATTERNS's own comment). */}
                        {eyePatterns && flow.engineState?.color && (
                          <TryOnPatternSwatches
                            className="w-full"
                            patterns={eyePatterns}
                            appliedPattern={(flow.engineState as IEyeTryOnState).pattern}
                            onSelect={handlePatternSelect}
                            disabled={!canInteract}
                          />
                        )}
                      </TryOnDock>
                    </>
                  )}
                </div>

                {/* Large screens only - unchanged from before. Below `lg:`, this same content is
              reachable through the two bottom-sheet triggers instead (just below). */}
                <div className="hidden min-h-0 flex-col gap-2 lg:flex">
                  <TryOnSidebar
                    category={tryOn.category}
                    mode={flow.mode}
                    onModeToggle={handleModeToggle}
                    cameraVideoRef={cameraVideoRef}
                    cameraReady={!!flow.engineState?.cameraReady}
                    previewImageUrl={flow.uploadedImageUrl}
                    onModelSelect={handleModelSelect}
                    // The model list is visible on every step, including select/instructions, where
                    // picking one is a valid shortcut straight into 'tryon' - only disable it once
                    // already inside 'tryon' and still not ready, never on the earlier steps.
                    modelsDisabled={flow.step === 'tryon' && !isTryOnReady}
                  />
                </div>

                <BottomButtons
                  isTryOnReady={isTryOnReady}
                  step={flow.step}
                  mode={flow.mode}
                  onModeToggle={handleModeToggle}
                  onModelsClick={setActiveSheet}
                />
              </div>
              <TryOnBottomSheet
                isOpen={activeSheet === 'models'}
                onClose={() => {
                  setActiveSheet(null);
                }}
                title="Choose a Model"
              >
                <TryOnModelList
                  direction="horizontal"
                  category={tryOn.category}
                  mode={flow.mode}
                  previewImageUrl={flow.uploadedImageUrl}
                  onModelSelect={handleModelSelect}
                  disabled={flow.step === 'tryon' && !isTryOnReady}
                />
              </TryOnBottomSheet>
            </>
          )}
        </TryOnSelectableFrame>
      </ModalWrapper>
    </TryOnAssetsProvider>
  );
};

export default TryOnModal;
