import { forwardRef } from 'react';

import type { ILipTryOnState } from '../../engine/categories/lip/index.js';
import { LipLiveEngine, LipUploadEngine } from '../../engine/categories/lip/index.js';
import type { ITryOnStageRef } from '../../types/index.js';

import type { ITryOnStageProps } from '../TryOnStage.js';
import TryOnStage from '../TryOnStage.js';

const ENGINES = { Live: LipLiveEngine, Upload: LipUploadEngine };

// Binds the shared TryOnStage to the Lip live/upload engine pair.
const LipTryOnStage = forwardRef<
  ITryOnStageRef<ILipTryOnState>,
  Omit<ITryOnStageProps<ILipTryOnState>, 'engines'>
>((props, ref) => <TryOnStage ref={ref} engines={ENGINES} {...props} />);

LipTryOnStage.displayName = 'LipTryOnStage';

export default LipTryOnStage;
