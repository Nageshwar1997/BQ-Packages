import { TRY_ON_CATEGORY_MAP } from '@beautinique/frontend-constants';
import type { TTryOnCategory } from '@beautinique/frontend-types';

import type { ITryOnError, TDetectionStatus, TTryOnMode } from '../types/index.js';

/** What the overlay over the picture says: an icon, a heading and the sentence under it. */
export interface IOverlayCopy {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

/* -------------------------------------------------------------------------- */
/*                         NOT READY (camera / photo)                         */
/* -------------------------------------------------------------------------- */

const WAIT_DESCRIPTION = 'This should only take a moment.';

// A `Record` over the modes: a third mode makes this fail to compile until it has its copy.
const LOADING_COPY: Record<TTryOnMode, IOverlayCopy> = {
  LIVE: {
    icon: 'solar:videocamera-record-linear',
    title: 'Waiting for camera permission...',
    description: WAIT_DESCRIPTION,
  },
  UPLOAD: {
    icon: 'solar:gallery-add-linear',
    title: 'Processing photo...',
    description: WAIT_DESCRIPTION,
  },
};

/**
 * What the overlay says while the try-on is not ready to be used: the setup failed (`error`, which
 * always carries its own heading and sentence, see `ITryOnError`), or it is still loading, which reads
 * differently for the camera (waiting for the permission) and for a photo (processing it).
 */
export const getNotReadyCopy = (mode: TTryOnMode, error: ITryOnError | undefined): IOverlayCopy =>
  error
    ? { icon: 'solar:danger-triangle-linear', title: error.title, description: error.description }
    : LOADING_COPY[mode];

/* -------------------------------------------------------------------------- */
/*                      DETECTION GUIDE (in frame / turned)                   */
/* -------------------------------------------------------------------------- */

/** The statuses that show a guide: every one but 'detected', which shows nothing. */
export type TGuideStatus = Exclude<TDetectionStatus, 'detected'>;

// `detectionStatus` is one field that every category reuses, but what it reports depends on what the
// category tracks: LIP, FACE and EYE track a face, HAIR its hair mask, NAIL the landmarks of a hand. The
// copy has to name *that*: a shopper who moves their hand out of frame must not read "Face not in frame".
type TTrackedSubject = 'face' | 'hair' | 'hand';

const SUBJECT_OF_CATEGORY = new Map<string, TTrackedSubject>([
  [TRY_ON_CATEGORY_MAP.HAIR, 'hair'],
  [TRY_ON_CATEGORY_MAP.NAIL, 'hand'],
]);

const notInFrame = (subject: string, possessive: string): IOverlayCopy => ({
  icon: 'solar:scanner-linear',
  title: `${subject} not in frame`,
  description: `Move so ${possessive} is inside the frame.`,
});

// Only FACE ever reports 'not-clear', so it stays about the face for every category (the other
// categories never reach it, but the table needs every status filled in).
const NOT_CLEAR: IOverlayCopy = {
  icon: 'solar:danger-triangle-linear',
  title: 'Face not clearly visible',
  description: "Move closer, and make sure there's good, even lighting.",
};

// 'turned' has two meanings: FACE and EYE track the same face mesh, and it is "the head is angled too
// far to one side"; for NAIL it is "a hand is in frame but not facing the camera nail-side-up" (without
// it a hand turned palm-out got no nails painted and no word of why, because the hand still counted as
// detected). HAIR and LIP never report it. Its icon is deliberately not the scanner of 'not-in-frame':
// it is its own situation (in frame, only angled), and it is the icon of the same tip on the
// instructions screen.
const FACE_TURNED: IOverlayCopy = {
  icon: 'solar:face-scan-circle-linear',
  title: 'Face turned too much',
  description: 'Face the camera directly - a slight turn is fine, just not a big one.',
};

const HAND_TURNED: IOverlayCopy = {
  icon: 'solar:hand-stars-linear',
  title: 'Hand turned the wrong way',
  description:
    'Show the back of your hand to the camera - your nails need to be visible, not your palm.',
};

// All of it built once, so the same object is given back every time and nothing is made per render. A
// `Record` over the statuses: a new status makes this fail to compile until every subject has its copy,
// instead of that case quietly falling through to the wrong one.
const GUIDE_COPY: Record<TTrackedSubject, Record<TGuideStatus, IOverlayCopy>> = {
  face: {
    'not-in-frame': notInFrame('face', 'your whole face'),
    'not-clear': NOT_CLEAR,
    turned: FACE_TURNED,
  },
  hair: {
    'not-in-frame': notInFrame('hair', 'your hair'),
    'not-clear': NOT_CLEAR,
    turned: FACE_TURNED,
  },
  hand: {
    'not-in-frame': notInFrame('hand', 'your whole hand'),
    'not-clear': NOT_CLEAR,
    turned: HAND_TURNED,
  },
};

/**
 * What the detection guide says for a status, in the words of what the category tracks. A category
 * that is not known (or none) is read as a face, which is what most of them track.
 */
export const getGuideCopy = (
  category: TTryOnCategory | undefined,
  status: TGuideStatus,
): IOverlayCopy => GUIDE_COPY[SUBJECT_OF_CATEGORY.get(category ?? '') ?? 'face'][status];
