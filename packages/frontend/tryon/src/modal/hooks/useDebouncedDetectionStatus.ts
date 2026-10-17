import { useEffect, useState } from 'react';

import type { TDetectionStatus } from '../../types/index.js';

// How long a non-'detected' detection-status reading has to hold continuously before this hook's
// returned value actually changes to it - showing a "not in frame"/"turned" overlay the instant a
// single frame reports one flickers constantly, since a stray frame or two of jitter/motion-blur/
// momentary occlusion is normal and shouldn't interrupt the flow. Recovering to 'detected' (or to
// `undefined`, e.g. on a mode/model switch) is never debounced - only a genuine problem needs to
// hold for this long before it's surfaced.
export const DETECTION_GUIDE_DEBOUNCE_MS = 1500;

/**
 * Debounces a raw, potentially-flickering `TDetectionStatus` reading (see that type's own comment
 * for what each value means) - used by TryOnModal to decide when its detection-guide overlay
 * actually shows. `rawStatus` should already be gated to `undefined` by the caller whenever
 * nothing meaningful can be read yet (e.g. before the stage is ready) - this hook only owns the
 * debounce timing, not that readiness gate.
 */
export default function useDebouncedDetectionStatus(
  rawStatus: TDetectionStatus | undefined,
): TDetectionStatus | undefined {
  const [debouncedStatus, setDebouncedStatus] = useState<TDetectionStatus | undefined>(undefined);

  useEffect(() => {
    // Recovering to 'detected' (or resetting to no reading at all, e.g. on mode/model switch -
    // see `rawStatus` itself going back to `undefined` while a new engine spins up) is never
    // debounced - only showing the warning needs the "did this actually last a while" check, not
    // clearing it once things are genuinely fine again.
    if (!rawStatus || rawStatus === 'detected') {
      // Mirrors an external signal (the engine's own state, by way of the caller's `rawStatus`),
      // not a render-derived value - a plain useMemo can't run this "only sometimes" conditionally
      // against a timer.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDebouncedStatus(rawStatus);
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedStatus(rawStatus);
    }, DETECTION_GUIDE_DEBOUNCE_MS);

    // The cleanup is what cancels a pending warning: a mode/model switch remounts the stage's
    // engine, whose fresh initial state briefly reports 'not-in-frame' (see
    // LipEngineBase.getInitialState) before the first real detection comes in. That transient
    // reading starts a timer; when the real 'detected' reading (the branch above) or another
    // reading arrives, this cleanup has already stopped it - a stale timer that fired ~1.5s later
    // would clobber the correct value right back to 'not-in-frame', the overlay flashing on for no
    // visible reason well after the switch.
    return () => {
      window.clearTimeout(timer);
    };
  }, [rawStatus]);

  return debouncedStatus;
}
