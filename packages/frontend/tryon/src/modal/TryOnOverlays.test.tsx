// @vitest-environment jsdom
import { TRY_ON_CATEGORY_MAP, TRY_ON_MAP } from '@beautinique/frontend-constants';
import type { TTryOnCategory, TTryOnSelection } from '@beautinique/frontend-types';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { click, installResizeObserver, required } from '../test-utils/dom.js';
import { fakeStages } from '../test-utils/fake-stage.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { DETECTION_GUIDE_DEBOUNCE_MS } from './hooks/useDebouncedDetectionStatus.js';
import TryOnModal from './TryOnModal.js';

// The five stages are replaced (see `fake-stage`): what is looked at is what the modal says over the
// picture, from the state its stage tells it.
vi.mock('./lip/LipTryOnStage.js', async () => ({
  default: (await import('../test-utils/fake-stage.js')).createFakeStage(TRY_ON_CATEGORY_MAP.LIP),
}));
vi.mock('./face/FaceTryOnStage.js', async () => ({
  default: (await import('../test-utils/fake-stage.js')).createFakeStage(TRY_ON_CATEGORY_MAP.FACE),
}));
vi.mock('./eye/EyeTryOnStage.js', async () => ({
  default: (await import('../test-utils/fake-stage.js')).createFakeStage(TRY_ON_CATEGORY_MAP.EYE),
}));
vi.mock('./hair/HairTryOnStage.js', async () => ({
  default: (await import('../test-utils/fake-stage.js')).createFakeStage(TRY_ON_CATEGORY_MAP.HAIR),
}));
vi.mock('./nail/NailTryOnStage.js', async () => ({
  default: (await import('../test-utils/fake-stage.js')).createFakeStage(TRY_ON_CATEGORY_MAP.NAIL),
}));

const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('button')];
const buttonNamed = (name: string) =>
  required(
    buttons().find(
      (button) => button.getAttribute('aria-label') === name || button.textContent === name,
    ),
    `the button ${name}`,
  );
const buttonStartingWith = (text: string) =>
  required(
    buttons().find((button) => button.textContent.startsWith(text)),
    `the button ${text}`,
  );

const open = (category: TTryOnCategory = TRY_ON_CATEGORY_MAP.LIP) =>
  mount(
    <TryOnModal
      isOpen
      onClose={vi.fn()}
      tryOn={{ category, subCategory: TRY_ON_MAP[category][0] } as TTryOnSelection}
      shades={[]}
      assets={{ baseUrl: '/tryon-assets/' }}
    />,
  );

const startLive = () => {
  click(buttonStartingWith('Try it Live'));
  click(buttonNamed('Start camera'));
};

/** The overlay over the picture: a status while it waits, an alert when something went wrong. */
const overlay = () => document.querySelector<HTMLElement>('[role="status"], [role="alert"]');

/** The stage tells the modal a change of its state, as its engine does. */
const emit = (partial: Record<string, unknown>) => {
  act(() => {
    fakeStages.emit(partial);
  });
};

/** Lets the time pass that a reading has to hold before the guide is shown. */
const holdLongEnough = () => {
  act(() => {
    vi.advanceTimersByTime(DETECTION_GUIDE_DEBOUNCE_MS);
  });
};

beforeEach(() => {
  window.innerHeight = 900;
  installResizeObserver();
  fakeStages.reset();
  vi.useFakeTimers();

  let n = 0;

  URL.createObjectURL = vi.fn(() => {
    n += 1;

    return `blob:photo-${String(n)}`;
  });
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  unmountAll();
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('the overlay while the try-on is not ready', () => {
  it('waits for the permission of the camera in live', () => {
    open();
    startLive();
    expect(overlay()).toBeNull();

    emit({ cameraReady: false });

    expect(overlay()?.getAttribute('role')).toBe('status');
    expect(overlay()?.textContent).toContain('Waiting for camera permission...');
    expect(overlay()?.textContent).toContain('This should only take a moment.');
    expect(overlay()?.querySelector('button')).toBeNull(); // nothing to retry while it waits
  });

  it('says a photo is being processed in upload', () => {
    open();
    click(buttonStartingWith('Upload Photo'));
    click(buttonNamed('Try on with the East Indian model'));
    expect(overlay()).toBeNull();

    emit({ imageReady: false });

    expect(overlay()?.textContent).toContain('Processing photo...');
    expect(overlay()?.textContent).toContain('This should only take a moment.');
  });

  it('says what went wrong, in an alert with its own heading and sentence, and a way to try again that makes a new stage', () => {
    open();
    startLive();
    expect(fakeStages.mounts).toHaveLength(1);

    emit({
      cameraReady: false,
      error: { title: 'Camera blocked', description: 'Allow the camera in your browser.' },
    });

    expect(overlay()?.getAttribute('role')).toBe('alert');
    expect(overlay()?.textContent).toContain('Camera blocked');
    expect(overlay()?.textContent).toContain('Allow the camera in your browser.');
    expect(overlay()?.textContent).not.toContain('Waiting for camera permission...');

    click(required(overlay()?.querySelector('button'), 'the retry button'));

    // a new stage was made, which tells it is ready: the error is gone
    expect(overlay()?.textContent ?? '').not.toContain('Camera blocked');
    expect(fakeStages.mounts).toHaveLength(2);
  });
});

describe('the detection guide while the try-on is ready', () => {
  it.each<[TTryOnCategory, string, string, string]>([
    [
      TRY_ON_CATEGORY_MAP.LIP,
      'not-in-frame',
      'face not in frame',
      'Move so your whole face is inside the frame.',
    ],
    [
      TRY_ON_CATEGORY_MAP.FACE,
      'not-in-frame',
      'face not in frame',
      'Move so your whole face is inside the frame.',
    ],
    [
      TRY_ON_CATEGORY_MAP.EYE,
      'not-in-frame',
      'face not in frame',
      'Move so your whole face is inside the frame.',
    ],
    [
      TRY_ON_CATEGORY_MAP.HAIR,
      'not-in-frame',
      'hair not in frame',
      'Move so your hair is inside the frame.',
    ],
    [
      TRY_ON_CATEGORY_MAP.NAIL,
      'not-in-frame',
      'hand not in frame',
      'Move so your whole hand is inside the frame.',
    ],
    [
      TRY_ON_CATEGORY_MAP.FACE,
      'not-clear',
      'Face not clearly visible',
      "Move closer, and make sure there's good",
    ],
    [TRY_ON_CATEGORY_MAP.FACE, 'turned', 'Face turned too much', 'Face the camera directly'],
    [TRY_ON_CATEGORY_MAP.EYE, 'turned', 'Face turned too much', 'Face the camera directly'],
    [
      TRY_ON_CATEGORY_MAP.NAIL,
      'turned',
      'Hand turned the wrong way',
      'Show the back of your hand to the camera',
    ],
  ])('%s, %s: names what the category tracks (%s)', (category, status, title, description) => {
    open(category);
    startLive();

    emit({ detectionStatus: status });
    expect(overlay()).toBeNull(); // a stray frame does not flicker the guide: the reading has to hold

    holdLongEnough();

    expect(overlay()?.getAttribute('role')).toBe('status');
    expect(overlay()?.textContent).toContain(title);
    expect(overlay()?.textContent).toContain(description);
  });

  it('says nothing while the subject is detected, and takes the guide away when it is detected again', () => {
    open(TRY_ON_CATEGORY_MAP.NAIL);
    startLive();
    expect(overlay()).toBeNull();

    emit({ detectionStatus: 'not-in-frame' });
    holdLongEnough();
    expect(overlay()?.textContent).toContain('hand not in frame');

    emit({ detectionStatus: 'detected' });

    expect(overlay()).toBeNull();
  });

  it('is not shown while the try-on is not ready: the wait is what is said, not a guide', () => {
    open();
    startLive();

    emit({ cameraReady: false, detectionStatus: 'not-in-frame' });
    holdLongEnough();

    expect(overlay()?.textContent).toContain('Waiting for camera permission...');
    expect(overlay()?.textContent).not.toContain('not in frame');
  });
});
