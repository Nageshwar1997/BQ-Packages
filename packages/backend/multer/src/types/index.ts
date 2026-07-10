import type { Multer, Options } from 'multer';
type TMediaKey = 'IMAGE' | 'VIDEO' | 'OTHER';

interface ICommonMulterFileConfigs {
  format?: Partial<Record<TMediaKey, string[]>>;
  size?: Partial<Record<TMediaKey, number>>;
}

export type TFile = Express.Multer.File;

export interface IMulterValidation extends ICommonMulterFileConfigs {
  type: keyof Multer;
  fieldName?: string;
  maxCount?: number;
  fieldsConfig?: { name: string; maxCount: number }[];
  limits?: Options['limits'];
  isDev?: boolean;
}

export interface ICollectCustomError extends ICommonMulterFileConfigs {
  files: TFile[];
}
export interface ICollectMulterError extends Pick<IMulterValidation, 'fieldName' | 'maxCount'> {
  error?: unknown;
}
