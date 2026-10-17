import { createContext, useContext } from 'react';

import type { ITryOnAssets } from '../types/assets.js';

/*
 * The `assets` option of the modal, for the parts of it that show an image (the model list, the
 * pattern picker) or make an engine (the stages). It is read when a stage mounts, so it is not meant
 * to change while the modal is open.
 */
const TryOnAssetsContext = createContext<ITryOnAssets | undefined>(undefined);

export const TryOnAssetsProvider = TryOnAssetsContext.Provider;

/** Where the files of the try-on are, as the modal was told (`undefined`: the defaults). */
export const useTryOnAssets = () => useContext(TryOnAssetsContext);
