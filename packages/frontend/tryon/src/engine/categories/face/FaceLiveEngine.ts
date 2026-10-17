import { withLiveCamera } from '../../withLiveCamera.js';
import { FaceEngineBase } from './FaceEngineBase.js';

export class FaceLiveEngine extends withLiveCamera(FaceEngineBase) {}
