import type { IMakeupState, ITryOnError, TRGBTuple } from '../types/index.js';
import { hexToRGBA } from '../utils/index.js';

// The state pub-sub + init/destroy lifecycle bookkeeping that `FaceLandmarkerEngineBase`/
// `HairSegmenterEngineBase`/`HandLandmarkerEngineBase` each hand-wrote identically (confirmed
// line-for-line identical across all three, not just similar) - none of it touches a detector
// (`FaceLandmarker`/`ImageSegmenter`/`HandLandmarker`) or a category's own `renderFrame`, so it
// carries no reason to differ between them. Composed into each engine base (`private readonly
// stateEngine = new TryOnStateEngine(...)`) rather than folded into one shared parent *class* the
// three would extend - the detector-loading/render/cleanup code that genuinely does differ between
// them stays inline and readable in each engine base's own file instead of being scattered across
// abstract hook methods on a common ancestor. `getInitialState`/`onStateUpdated` are threaded in
// as plain callbacks (not by extending an abstract class) specifically so this file never needs to
// know it's being composed *by* an abstract class with those as abstract members - it only needs
// two functions.
// Shown when an engine can't finish setting up - the detector's WASM/model files (fetched from a
// CDN) or the category's assets didn't load. Shared by every engine base, since the cause and the
// fix (check the connection, Retry) are the same whichever tracking model failed.
export const TRYON_LOAD_ERROR: ITryOnError = {
  title: "Couldn't load Try-On",
  description:
    'The Try-On needs a few files from the internet. Check your connection, then tap Retry.',
};

export class TryOnStateEngine<TState extends IMakeupState> {
  private state: TState;
  private cachedRGB: TRGBTuple | null = null;

  private listeners: ((state: TState) => void)[] = [];

  private destroyed = false;
  private initToken = 0;
  private abortController: AbortController | null = null;

  private readonly getInitialState: () => TState;
  private readonly onStateUpdated: () => void;

  constructor(
    getInitialState: () => TState,
    onStateUpdated: () => void,
    initialState?: Partial<TState>,
  ) {
    this.getInitialState = getInitialState;
    this.onStateUpdated = onStateUpdated;
    this.state = { ...getInitialState(), ...initialState };

    // A color seeded straight through `initialState` (e.g. switching Live<->Upload, or picking a
    // different model, with a shade already applied - see TryOnModal's `initialState`) never goes
    // through `updateState.set` below, so a render would silently no-op (it bails on
    // `!cachedRGB`) even though `state.color` - and so the UI's "selected" swatch - is correct.
    if (this.state.color) {
      const [r, g, b] = hexToRGBA(this.state.color);
      this.cachedRGB = [r, g, b];
    }
  }

  get currentState(): TState {
    return this.state;
  }

  get rgb(): TRGBTuple | null {
    return this.cachedRGB;
  }

  // Grouped under one namespace (rather than loose public methods) so the React wrapper's
  // imperative ref can expose `engine.updateState.set(...)` directly. UI-driven updates go
  // through `set`, which can't touch the lifecycle-owned fields - those are only ever flipped
  // internally (`setCameraReady`/`setImageReady`/`setTryOnStarted`).
  public updateState = {
    set: (partial: Partial<TState>) => {
      const {
        cameraReady: _cameraReady,
        imageReady: _imageReady,
        tryOnStarted: _tryOnStarted,
        error: _error,
        ...safePartial
      } = partial;

      const prev = this.state;
      this.state = { ...prev, ...safePartial };

      if (safePartial.color && safePartial.color !== prev.color) {
        const [r, g, b] = hexToRGBA(safePartial.color);
        this.cachedRGB = [r, g, b];
      }

      this.notify();
      this.onStateUpdated();
    },

    internalReset: () => {
      this.state = this.getInitialState();
      this.cachedRGB = null;
      this.notify();
    },

    setCameraReady: (value: boolean) => {
      this.state = { ...this.state, cameraReady: value };
      this.notify();
    },

    setImageReady: (value: boolean) => {
      this.state = { ...this.state, imageReady: value };
      this.notify();
    },

    setTryOnStarted: (value: boolean) => {
      this.state = { ...this.state, tryOnStarted: value };
      this.notify();
    },

    setError: (error: ITryOnError | undefined) => {
      this.state = { ...this.state, error };
      this.notify();
    },

    // Called every `renderFrame` (unlike every other setter here, which only ever fires at an
    // explicit lifecycle transition) - guarded so a run of frames reporting the same status
    // doesn't `notify()` (and so re-render React) on every single one of them, only on an actual
    // change.
    setDetectionStatus: (value: TState['detectionStatus']) => {
      if (this.state.detectionStatus === value) return;
      this.state = { ...this.state, detectionStatus: value };
      this.notify();
    },
  };

  private notify() {
    this.listeners.forEach((listener) => {
      listener(this.state);
    });
  }

  public onChange(listener: (state: TState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Called at the start of `startTryOn` - bumps the init token (invalidating any still-in-flight
  // previous init), opens a fresh abort signal for this attempt, and un-destroys the engine (a
  // second `startTryOn` after a `destroy` shouldn't stay permanently locked out). Exact same
  // three-step order the original per-category `startTryOn` methods used.
  public beginInit(): { token: number; signal: AbortSignal } {
    const token = ++this.initToken;
    this.abortController?.abort();
    this.abortController = new AbortController();
    this.destroyed = false;
    return { token, signal: this.abortController.signal };
  }

  public ensureAlive(token?: number): boolean {
    if (this.destroyed) return false;
    if (token !== undefined && token !== this.initToken) return false;
    return true;
  }

  // Called from `destroy()` - marks the engine dead and invalidates/aborts any in-flight init,
  // but deliberately does NOT touch `listeners` or reset `state` itself (see `resetListeners`
  // below) - `destroy()`'s caller still needs to run its own category-specific cleanup (dropping
  // its detector reference) before those happen, same ordering the original `cleanup()` used.
  public markDestroyed() {
    this.destroyed = true;
    this.initToken++;
    this.abortController?.abort();
    this.abortController = null;
  }

  // Split out from `updateState.internalReset` (which a live UI-driven reset also uses) so
  // `cleanup()` can drop stale listeners *before* resetting state - notifying a listener that's
  // about to be torn down anyway would be pointless at best.
  public resetListeners() {
    this.listeners = [];
  }
}
