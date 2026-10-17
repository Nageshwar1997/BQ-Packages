// @vitest-environment jsdom
import { TRY_ON_SUB_CATEGORY_MAP } from '@beautinique/frontend-constants';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TRYON_MODE_MAP } from '../../constants/index.js';
import { renderHook, unmountAll } from '../../test-utils/react.js';
import type { ITryOnError } from '../../types/index.js';
import useTryOnFlow, {
  type ITryOnFlowState,
  type ITryOnStageColorRangeRef,
} from './useTryOnFlow.js';

let isOpen = true;
let onUploadError: ((error: ITryOnError) => void) | undefined;

const setup = () => {
  isOpen = true;
  onUploadError = undefined;

  const view = renderHook(() => useTryOnFlow(isOpen, onUploadError));
  const flow = () => view.result.current;
  const run = (action: () => void) => {
    act(action);
  };

  return { view, flow, run };
};

/** What an engine tells the modal about itself. */
const engineState = (patch: Record<string, unknown> = {}) =>
  ({
    type: TRY_ON_SUB_CATEGORY_MAP.MATTE,
    color: null,
    range: 0.4,
    cameraReady: false,
    imageReady: false,
    tryOnStarted: false,
    detectionStatus: 'detected',
    ...patch,
  }) as unknown as NonNullable<ITryOnFlowState['engineState']>;

const stage = () => {
  const ref: ITryOnStageColorRangeRef = {
    setMakeupState: vi.fn(),
    getState: vi.fn(),
    takeSnapshot: vi.fn(() => 'data:image/png;base64,AAAA'),
    getStream: vi.fn(() => null),
    setComparePosition: vi.fn(),
    getCanvas: vi.fn(() => document.createElement('canvas')),
  };

  return ref;
};

const photo = (name = 'face.png', type = 'image/png') =>
  new File([new Uint8Array(8)], name, { type });

beforeEach(() => {
  let n = 0;

  URL.createObjectURL = vi.fn(() => {
    n += 1;

    return `blob:flow-${String(n)}`;
  });
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  unmountAll();
  vi.restoreAllMocks();
});

describe('useTryOnFlow', () => {
  describe('the steps', () => {
    it('starts at the choice of a mode, in live', () => {
      const { flow } = setup();

      expect(flow().flow).toMatchObject({
        step: 'select',
        mode: TRYON_MODE_MAP.LIVE,
        uploadedImageUrl: null,
        engineState: null,
        carriedColor: null,
      });
    });

    it('goes from the choice of a mode to the tips of that mode', () => {
      const { flow, run } = setup();

      run(() => {
        flow().handleSelectMode(TRYON_MODE_MAP.UPLOAD);
      });

      expect(flow().flow).toMatchObject({ step: 'instructions', mode: TRYON_MODE_MAP.UPLOAD });
    });

    it('goes from the tips to the camera in live', () => {
      const { flow, run } = setup();

      run(() => {
        flow().handleSelectMode(TRYON_MODE_MAP.LIVE);
      });
      run(() => {
        flow().handleStartLive();
      });

      expect(flow().flow.step).toBe('tryon');
    });

    it('goes from the tips to the photo when a photo is chosen, and shows it', () => {
      const { flow, run } = setup();

      run(() => {
        flow().handleSelectMode(TRYON_MODE_MAP.UPLOAD);
      });
      run(() => {
        flow().handleFileSelected(photo());
      });

      expect(flow().flow.step).toBe('tryon');
      expect(flow().flow.uploadedImageUrl).toBe('blob:flow-1');
    });

    it('stays at the tips when the photo is turned down, and keeps the reason', () => {
      const { flow, run } = setup();

      run(() => {
        flow().handleSelectMode(TRYON_MODE_MAP.UPLOAD);
      });
      run(() => {
        flow().handleFileSelected(photo('notes.txt', 'text/plain'));
      });

      expect(flow().flow.step).toBe('instructions');
      expect(flow().uploadError?.title).toBe('Unsupported photo type');
    });

    it('tells the app about a photo that is turned down, and keeps no reason, when the app asks to', () => {
      const { flow, run } = setup();
      const told = vi.fn();

      onUploadError = told;
      run(() => {
        flow().handleSelectMode(TRYON_MODE_MAP.UPLOAD);
      });
      run(() => {
        flow().handleFileSelected(photo('notes.txt', 'text/plain'));
      });

      expect(told).toHaveBeenCalledTimes(1);
      expect(flow().uploadError).toBeNull();
      expect(flow().flow.step).toBe('instructions');
    });

    it('forgets the reason of a turned down photo when the person goes to another mode or back', () => {
      const { flow, run } = setup();

      run(() => {
        flow().handleSelectMode(TRYON_MODE_MAP.UPLOAD);
      });
      run(() => {
        flow().handleFileSelected(photo('notes.txt', 'text/plain'));
      });
      run(() => {
        flow().handleModeToggle(TRYON_MODE_MAP.LIVE);
      });
      expect(flow().uploadError).toBeNull();

      run(() => {
        flow().handleSelectMode(TRYON_MODE_MAP.UPLOAD);
      });
      run(() => {
        flow().handleFileSelected(photo('notes.txt', 'text/plain'));
      });
      run(() => {
        flow().handleBackToSelect();
      });
      expect(flow().uploadError).toBeNull();
    });

    it('goes back to the tips of a mode when it is chosen again (a way to start over)', () => {
      const { flow, run } = setup();

      run(() => {
        flow().setFlow({
          ...flow().flow,
          step: 'tryon',
          mode: TRYON_MODE_MAP.UPLOAD,
          uploadedImageUrl: 'x',
        });
      });
      run(() => {
        flow().handleModeToggle(TRYON_MODE_MAP.UPLOAD);
      });

      expect(flow().flow).toMatchObject({
        step: 'instructions',
        mode: TRYON_MODE_MAP.UPLOAD,
        uploadedImageUrl: null,
        engineState: null,
      });
    });

    it('goes back to the choice of a mode', () => {
      const { flow, run } = setup();

      run(() => {
        flow().handleSelectMode(TRYON_MODE_MAP.UPLOAD);
      });
      run(() => {
        flow().handleBackToSelect();
      });

      expect(flow().flow.step).toBe('select');
    });

    it('tries a model straight away, in upload, whatever the step and the mode were', () => {
      const { flow, run } = setup();

      run(() => {
        flow().handleModelSelect('https://cdn.example.com/models/face/East-Indian.webp');
      });

      expect(flow().flow).toMatchObject({
        step: 'tryon',
        mode: TRYON_MODE_MAP.UPLOAD,
        uploadedImageUrl: 'https://cdn.example.com/models/face/East-Indian.webp',
      });
    });
  });

  describe('being ready', () => {
    it('is not, before the try-on step', () => {
      const { flow, run } = setup();

      run(() => {
        flow().setFlow({ ...flow().flow, engineState: engineState({ cameraReady: true }) });
      });

      expect(flow().isTryOnReady).toBe(false);
    });

    it('in live is the camera being ready', () => {
      const { flow, run } = setup();

      run(() => {
        flow().setFlow({
          ...flow().flow,
          step: 'tryon',
          mode: TRYON_MODE_MAP.LIVE,
          engineState: engineState(),
        });
      });
      expect(flow().isTryOnReady).toBe(false);

      run(() => {
        flow().setFlow({ ...flow().flow, engineState: engineState({ cameraReady: true }) });
      });
      expect(flow().isTryOnReady).toBe(true);
    });

    it('in upload is a photo, and the photo being ready (one without the other is not enough)', () => {
      const { flow, run } = setup();

      run(() => {
        flow().setFlow({
          ...flow().flow,
          step: 'tryon',
          mode: TRYON_MODE_MAP.UPLOAD,
          engineState: engineState({ imageReady: true }),
        });
      });
      expect(flow().isTryOnReady).toBe(false); // ready, but there is no photo

      run(() => {
        flow().setFlow({ ...flow().flow, uploadedImageUrl: 'blob:x', engineState: engineState() });
      });
      expect(flow().isTryOnReady).toBe(false); // a photo, but not ready

      run(() => {
        flow().setFlow({ ...flow().flow, engineState: engineState({ imageReady: true }) });
      });
      expect(flow().isTryOnReady).toBe(true);
    });
  });

  describe('closing', () => {
    it('puts everything back, so the next time it opens it starts from the beginning', () => {
      const { view, flow, run } = setup();

      run(() => {
        flow().handleSelectMode(TRYON_MODE_MAP.UPLOAD);
      });
      run(() => {
        flow().handleFileSelected(photo());
      });
      run(() => {
        flow().handleRetry();
      });
      run(() => {
        flow().setActiveSheet('models');
      });
      expect(flow().retryKey).toBe(1);

      isOpen = false;
      view.rerender();

      expect(flow().flow.step).toBe('select');
      expect(flow().flow.uploadedImageUrl).toBeNull();
      expect(flow().retryKey).toBe(0);
      expect(flow().activeSheet).toBeNull();
      expect(flow().compareCanvas).toBeNull();
    });

    it('forgets the reason of a turned down photo', () => {
      const { view, flow, run } = setup();

      run(() => {
        flow().handleSelectMode(TRYON_MODE_MAP.UPLOAD);
      });
      run(() => {
        flow().handleFileSelected(photo('notes.txt', 'text/plain'));
      });
      expect(flow().uploadError).not.toBeNull();

      isOpen = false;
      view.rerender();

      expect(flow().uploadError).toBeNull();
    });

    it('keeps nothing of a shade that was carried to another subcategory', () => {
      const { view, flow, run } = setup();

      run(() => {
        flow().setFlow({
          ...flow().flow,
          step: 'tryon',
          engineState: engineState({ color: '#aa0000' }),
        });
      });
      run(() => {
        flow().handleSelectionChange();
      });
      expect(flow().flow.carriedColor).toBe('#aa0000');

      isOpen = false;
      view.rerender();

      expect(flow().flow.carriedColor).toBeNull();
    });
  });

  describe('choosing another category or subcategory (the selectable modal)', () => {
    const inTryOn = (color: string | null) => {
      const context = setup();

      context.run(() => {
        context.flow().setFlow({
          ...context.flow().flow,
          step: 'tryon',
          mode: TRYON_MODE_MAP.UPLOAD,
          uploadedImageUrl: 'blob:photo',
          engineState: engineState({ color, range: 0.9, imageReady: true }),
        });
      });
      context.run(() => {
        context.flow().setActiveSheet('models');
      });

      return context;
    };

    it('drops the state of the engine that goes away: the new engine tells its own', () => {
      const { flow, run } = inTryOn('#aa0000');

      run(() => {
        flow().handleSelectionChange();
      });

      expect(flow().flow.engineState).toBeNull();
      expect(flow().isTryOnReady).toBe(false); // so the modal says "processing" until the new engine is
    });

    it('carries the shade, so it is the same shade that is seen on another makeup', () => {
      const { flow, run } = inTryOn('#aa0000');

      run(() => {
        flow().handleSelectionChange();
      });

      expect(flow().flow.carriedColor).toBe('#aa0000');
    });

    it('carries no shade when there was none', () => {
      const { flow, run } = inTryOn(null);

      run(() => {
        flow().handleSelectionChange();
      });

      expect(flow().flow.carriedColor).toBeNull();
    });

    it('does not bring a shade back that was taken away: a deselected shade (null) is carried as none', () => {
      const { flow, run } = inTryOn('#aa0000');

      run(() => {
        flow().handleSelectionChange();
      });
      // the new engine tells its state: the person took the shade away
      run(() => {
        flow().setFlow({ ...flow().flow, engineState: engineState({ color: null }) });
      });
      run(() => {
        flow().handleSelectionChange();
      });

      expect(flow().flow.carriedColor).toBeNull();
    });

    it('keeps the carried shade while no engine has told its state yet (two changes in a row)', () => {
      const { flow, run } = inTryOn('#aa0000');

      run(() => {
        flow().handleSelectionChange();
      });
      run(() => {
        flow().handleSelectionChange();
      });

      expect(flow().flow.carriedColor).toBe('#aa0000');
    });

    it('keeps the step, the mode and the photo where they were', () => {
      const { flow, run } = inTryOn('#aa0000');

      run(() => {
        flow().handleSelectionChange();
      });

      expect(flow().flow).toMatchObject({
        step: 'tryon',
        mode: TRYON_MODE_MAP.UPLOAD,
        uploadedImageUrl: 'blob:photo',
      });
    });

    it('closes what belonged to the old engine: the comparison and the sheet of models', () => {
      const { flow, run } = inTryOn('#aa0000');
      const ref = stage();

      flow().stageRef.current = ref;
      run(() => {
        flow().handleCompareToggle();
      });
      expect(flow().compareCanvas).not.toBeNull();

      run(() => {
        flow().handleSelectionChange();
      });

      expect(flow().compareCanvas).toBeNull();
      expect(flow().activeSheet).toBeNull();
    });
  });

  describe('what the person does on the stage', () => {
    it('applies a shade through the stage, and takes it away with null', () => {
      const { flow, run } = setup();
      const ref = stage();

      flow().stageRef.current = ref;
      run(() => {
        flow().handleShadeSelect('#ff0000');
      });
      run(() => {
        flow().handleShadeSelect(null);
      });

      expect(ref.setMakeupState).toHaveBeenNthCalledWith(1, { color: '#ff0000' });
      expect(ref.setMakeupState).toHaveBeenNthCalledWith(2, { color: null });
    });

    it('applies a pattern, and resets the makeup (the shade only)', () => {
      const { flow, run } = setup();
      const ref = stage();

      flow().stageRef.current = ref;
      run(() => {
        flow().handlePatternSelect('winged');
      });
      run(() => {
        flow().handleResetMakeup();
      });

      expect(ref.setMakeupState).toHaveBeenNthCalledWith(1, { pattern: 'winged' });
      expect(ref.setMakeupState).toHaveBeenNthCalledWith(2, { color: null });
    });

    it('does nothing when no stage is mounted yet', () => {
      const { flow, run } = setup();

      expect(() => {
        run(() => {
          flow().handleShadeSelect('#ff0000');
          flow().handleDownload();
          flow().handleCompareToggle();
        });
      }).not.toThrow();
    });

    it('compares: the split goes to the middle, and back to the whole picture when it is turned off', () => {
      const { flow, run } = setup();
      const ref = stage();

      flow().stageRef.current = ref;
      run(() => {
        flow().handleCompareToggle();
      });
      expect(flow().compareCanvas).toBeInstanceOf(HTMLCanvasElement);
      expect(ref.setComparePosition).toHaveBeenLastCalledWith(0.5);

      run(() => {
        flow().handleCompareToggle();
      });
      expect(flow().compareCanvas).toBeNull();
      expect(ref.setComparePosition).toHaveBeenLastCalledWith(null);
    });

    it('downloads the snapshot as a file called Try-On.png', () => {
      const { flow, run } = setup();
      const ref = stage();
      const clicked: { href: string; download: string }[] = [];

      flow().stageRef.current = ref;
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        clicked.push({ href: this.href, download: this.download });
      });
      run(() => {
        flow().handleDownload();
      });

      expect(clicked).toEqual([{ href: 'data:image/png;base64,AAAA', download: 'Try-On.png' }]);
    });

    it('downloads nothing when there is no snapshot', () => {
      const { flow, run } = setup();
      const ref = stage();
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);

      vi.mocked(ref.takeSnapshot).mockReturnValue(null);
      flow().stageRef.current = ref;
      run(() => {
        flow().handleDownload();
      });

      expect(click).not.toHaveBeenCalled();
    });

    it('mounts the stage again for a retry: the key changes each time', () => {
      const { flow, run } = setup();

      run(() => {
        flow().handleRetry();
      });
      run(() => {
        flow().handleRetry();
      });

      expect(flow().retryKey).toBe(2);
    });
  });
});
