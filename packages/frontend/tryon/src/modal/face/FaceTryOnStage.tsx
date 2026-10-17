import { forwardRef } from 'react';

import type { IFaceTryOnState } from '../../engine/categories/face/index.js';
import { FaceLiveEngine, FaceUploadEngine } from '../../engine/categories/face/index.js';
import type { ITryOnStageRef } from '../../types/index.js';

import type { ITryOnStageProps } from '../TryOnStage.js';
import TryOnStage from '../TryOnStage.js';

const ENGINES = { Live: FaceLiveEngine, Upload: FaceUploadEngine };

// Binds the shared TryOnStage to the Face live/upload engine pair.
const FaceTryOnStage = forwardRef<
  ITryOnStageRef<IFaceTryOnState>,
  Omit<ITryOnStageProps<IFaceTryOnState>, 'engines'>
>((props, ref) => <TryOnStage ref={ref} engines={ENGINES} {...props} />);

FaceTryOnStage.displayName = 'FaceTryOnStage';

export default FaceTryOnStage;
