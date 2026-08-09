import { ValidationError } from '@beautinique/backend-classes';
import { Types } from 'mongoose';

/* ========== OBJECT ID CONVERTER FUNCTION ========== */
export const toObjectId = (id: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid ObjectId.');
  }

  return new Types.ObjectId(id);
};

export const getObjId = (id: string | Types.ObjectId): Types.ObjectId => {
  return typeof id === 'string' ? toObjectId(id) : id;
};
