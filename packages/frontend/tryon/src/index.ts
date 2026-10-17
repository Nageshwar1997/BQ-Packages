/*
 * `@beautinique/frontend-tryon`: the virtual try-on (lips, face, eyes, hair, nails; live camera or a
 * photo). The root is the light part: the modal as a component that loads its engines when it is
 * first opened, the constants (the same ones `@beautinique/frontend-tryon/constants` gives, for a
 * form that needs only them) and the types. `@beautinique/frontend-tryon/modal` is the heavy part,
 * for whoever wants it in their own bundle at once.
 */
export * from './constants/index.js';
export type { ITryOnModalProps } from './modal/TryOnModal.js';
export { TryOnModal } from './TryOnModalLazy.js';
export type { ITryOnAssets } from './types/assets.js';
export type { IShade, ITryOnError } from './types/index.js';
