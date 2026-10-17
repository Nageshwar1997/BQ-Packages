/*
 * `@beautinique/frontend-tryon/modal`: the try-on itself, with its engines (MediaPipe) and its
 * screens. It is the heavy part of the package: importing it puts MediaPipe in the bundle of the
 * place that imports it. The root of the package (`@beautinique/frontend-tryon`) gives the same
 * `TryOnModal` as a component that loads this file when the modal is first opened.
 */
export { type ITryOnModalProps, default as TryOnModal } from './TryOnModal.js';
