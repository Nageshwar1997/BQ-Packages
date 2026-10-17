import { withLiveCamera } from '../../withLiveCamera.js';
import { NailEngineBase } from './NailEngineBase.js';

export class NailLiveEngine extends withLiveCamera(NailEngineBase) {}
