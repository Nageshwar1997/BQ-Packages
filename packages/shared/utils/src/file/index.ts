import { GB, KB, MB } from '@beautinique/shared-constants';

const getSize = (value: number) => {
  return (Number.isInteger(value) ? value : value.toFixed(2)).toString();
};

export const formatFileSize = (size: number) => {
  if (size < KB) {
    return `${String(size)} Bytes`;
  }

  if (size < MB) {
    return `${getSize(size / KB)} KB`;
  }

  if (size < GB) {
    return `${getSize(size / MB)} MB`;
  }

  return `${getSize(size / GB)} GB`;
};
