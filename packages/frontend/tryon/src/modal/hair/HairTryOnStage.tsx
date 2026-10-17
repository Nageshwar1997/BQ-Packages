import { forwardRef } from 'react';

import type { IHairTryOnState } from '../../engine/categories/hair/index.js';
import { HairLiveEngine, HairUploadEngine } from '../../engine/categories/hair/index.js';
import type { ITryOnStageRef } from '../../types/index.js';

import type { ITryOnStageProps } from '../TryOnStage.js';
import TryOnStage from '../TryOnStage.js';

const ENGINES = { Live: HairLiveEngine, Upload: HairUploadEngine };

// Binds the shared TryOnStage to the Hair live/upload engine pair.
const HairTryOnStage = forwardRef<
  ITryOnStageRef<IHairTryOnState>,
  Omit<ITryOnStageProps<IHairTryOnState>, 'engines'>
>((props, ref) => <TryOnStage ref={ref} engines={ENGINES} {...props} />);

HairTryOnStage.displayName = 'HairTryOnStage';

export default HairTryOnStage;
