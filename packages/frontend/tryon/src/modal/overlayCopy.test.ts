// @vitest-environment node
import { TRY_ON_CATEGORIES } from '@beautinique/frontend-constants';
import type { TTryOnCategory } from '@beautinique/frontend-types';
import { describe, expect, it } from 'vitest';

import type { TTryOnMode } from '../types/index.js';
import { getGuideCopy, getNotReadyCopy, type TGuideStatus } from './overlayCopy.js';

/*
 * The words are written out here as they were when they were part of the modal, and not read from the
 * module: a refactor of where they live must not change one of them.
 */

describe('getNotReadyCopy', () => {
  it('waits for the permission while the camera is not ready', () => {
    expect(getNotReadyCopy('LIVE', undefined)).toEqual({
      icon: 'solar:videocamera-record-linear',
      title: 'Waiting for camera permission...',
      description: 'This should only take a moment.',
    });
  });

  it('says a photo is being processed while it is', () => {
    expect(getNotReadyCopy('UPLOAD', undefined)).toEqual({
      icon: 'solar:gallery-add-linear',
      title: 'Processing photo...',
      description: 'This should only take a moment.',
    });
  });

  it.each<TTryOnMode>(['LIVE', 'UPLOAD'])(
    'says what went wrong, with its own heading and sentence, in the warning icon (%s)',
    (mode) => {
      expect(
        getNotReadyCopy(mode, { title: 'Camera blocked', description: 'Allow the camera.' }),
      ).toEqual({
        icon: 'solar:danger-triangle-linear',
        title: 'Camera blocked',
        description: 'Allow the camera.',
      });
    },
  );

  it('gives an error exactly what it carries, even an empty text (it is not replaced by the waiting copy)', () => {
    expect(getNotReadyCopy('LIVE', { title: '', description: '' })).toEqual({
      icon: 'solar:danger-triangle-linear',
      title: '',
      description: '',
    });
  });

  it('gives the same object for the same wait, so nothing is made per render', () => {
    expect(getNotReadyCopy('LIVE', undefined)).toBe(getNotReadyCopy('LIVE', undefined));
  });
});

describe('getGuideCopy', () => {
  const NOT_IN_FRAME = {
    face: {
      icon: 'solar:scanner-linear',
      title: 'face not in frame',
      description: 'Move so your whole face is inside the frame.',
    },
    hair: {
      icon: 'solar:scanner-linear',
      title: 'hair not in frame',
      description: 'Move so your hair is inside the frame.',
    },
    hand: {
      icon: 'solar:scanner-linear',
      title: 'hand not in frame',
      description: 'Move so your whole hand is inside the frame.',
    },
  };
  const NOT_CLEAR = {
    icon: 'solar:danger-triangle-linear',
    title: 'Face not clearly visible',
    description: "Move closer, and make sure there's good, even lighting.",
  };
  const FACE_TURNED = {
    icon: 'solar:face-scan-circle-linear',
    title: 'Face turned too much',
    description: 'Face the camera directly - a slight turn is fine, just not a big one.',
  };
  const HAND_TURNED = {
    icon: 'solar:hand-stars-linear',
    title: 'Hand turned the wrong way',
    description:
      'Show the back of your hand to the camera - your nails need to be visible, not your palm.',
  };

  /** What each category tracks: a face (LIP, FACE, EYE), its hair mask (HAIR), or a hand (NAIL). */
  const TRACKS: Record<TTryOnCategory, 'face' | 'hair' | 'hand'> = {
    LIP: 'face',
    FACE: 'face',
    EYE: 'face',
    HAIR: 'hair',
    NAIL: 'hand',
  };

  describe.each(TRY_ON_CATEGORIES)('%s', (category) => {
    const tracked = TRACKS[category];

    it(`names what it tracks (${tracked}) when it is not in frame`, () => {
      expect(getGuideCopy(category, 'not-in-frame')).toEqual(NOT_IN_FRAME[tracked]);
    });

    it('says the face is not clear in the words of the face, which is the only thing that reports it', () => {
      expect(getGuideCopy(category, 'not-clear')).toEqual(NOT_CLEAR);
    });

    it(`says turned in the words of ${tracked === 'hand' ? 'the hand' : 'the face'}`, () => {
      expect(getGuideCopy(category, 'turned')).toEqual(
        tracked === 'hand' ? HAND_TURNED : FACE_TURNED,
      );
    });
  });

  it('reads as a face when there is no category (before something is chosen), as most categories track one', () => {
    expect(getGuideCopy(undefined, 'not-in-frame')).toEqual(NOT_IN_FRAME.face);
    expect(getGuideCopy(undefined, 'turned')).toEqual(FACE_TURNED);
  });

  it.each(['BODY', 'constructor', '__proto__', ''])(
    'reads as a face for a category it does not know (%j): the product can get one before the app has the package for it',
    (category) => {
      expect(getGuideCopy(category as TTryOnCategory, 'not-in-frame')).toEqual(NOT_IN_FRAME.face);
    },
  );

  it('gives the same object every time, so nothing is made per render', () => {
    for (const status of [
      'not-in-frame',
      'not-clear',
      'turned',
    ] as const satisfies TGuideStatus[]) {
      expect(getGuideCopy('NAIL', status)).toBe(getGuideCopy('NAIL', status));
    }
  });

  it('has a title and a sentence for every status of every category', () => {
    for (const category of TRY_ON_CATEGORIES) {
      for (const status of ['not-in-frame', 'not-clear', 'turned'] as const) {
        const copy = getGuideCopy(category, status);

        expect(copy.title, `${category} ${status}`).not.toBe('');
        expect(copy.description, `${category} ${status}`).not.toBe('');
        expect(copy.icon, `${category} ${status}`).toMatch(/^[a-z-]+:[a-z0-9-]+$/);
      }
    }
  });
});
