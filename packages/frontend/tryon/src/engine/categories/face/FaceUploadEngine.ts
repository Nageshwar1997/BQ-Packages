import { withImageUpload } from '../../withImageUpload.js';
import { FaceEngineBase } from './FaceEngineBase.js';

export class FaceUploadEngine extends withImageUpload(FaceEngineBase) {}
