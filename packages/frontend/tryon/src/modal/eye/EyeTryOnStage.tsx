import { forwardRef } from 'react';

import type { IEyeTryOnState } from '../../engine/categories/eye/index.js';
import { EyeLiveEngine, EyeUploadEngine } from '../../engine/categories/eye/index.js';
import type { ITryOnStageRef } from '../../types/index.js';

import type { ITryOnStageProps } from '../TryOnStage.js';
import TryOnStage from '../TryOnStage.js';

const ENGINES = { Live: EyeLiveEngine, Upload: EyeUploadEngine };

// Binds the shared TryOnStage to the Eye live/upload engine pair.
const EyeTryOnStage = forwardRef<
  ITryOnStageRef<IEyeTryOnState>,
  Omit<ITryOnStageProps<IEyeTryOnState>, 'engines'>
>((props, ref) => <TryOnStage ref={ref} engines={ENGINES} {...props} />);

EyeTryOnStage.displayName = 'EyeTryOnStage';

export default EyeTryOnStage;
