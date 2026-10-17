import { forwardRef } from 'react';

import type { INailTryOnState } from '../../engine/categories/nail/index.js';
import { NailLiveEngine, NailUploadEngine } from '../../engine/categories/nail/index.js';
import type { ITryOnStageRef } from '../../types/index.js';

import type { ITryOnStageProps } from '../TryOnStage.js';
import TryOnStage from '../TryOnStage.js';

const ENGINES = { Live: NailLiveEngine, Upload: NailUploadEngine };

// Binds the shared TryOnStage to the Nail live/upload engine pair.
const NailTryOnStage = forwardRef<
  ITryOnStageRef<INailTryOnState>,
  Omit<ITryOnStageProps<INailTryOnState>, 'engines'>
>((props, ref) => <TryOnStage ref={ref} engines={ENGINES} {...props} />);

NailTryOnStage.displayName = 'NailTryOnStage';

export default NailTryOnStage;
