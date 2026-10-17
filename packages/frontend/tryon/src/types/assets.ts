/**
 * Where the files of the try-on are (the models and the images, see the assets package
 * `@beautinique/frontend-tryon-assets`). Every field is optional: without any, the files come from a
 * CDN, in the version the try-on was tested with.
 */
export interface ITryOnAssets {
  /**
   * Where the folders of the assets package (`models/`, `images/`) are served from, with or without
   * a closing slash: `'/tryon-assets/'` for your own origin, or the address of a CDN folder.
   * @default the assets package in the jsDelivr CDN, in the version the try-on was tested with
   */
  baseUrl?: string;
  /**
   * Gives the address of a file, by its path inside the assets package (`'models/face_landmarker.task'`,
   * `'images/eye/kajal/Bold.webp'`). For when the addresses are not one folder (the hashed names of a
   * bundler). It wins over `baseUrl`.
   */
  resolve?: (path: string) => string;
  /**
   * The folder of the WebAssembly files of MediaPipe (`vision_wasm_internal.js` and the others). They
   * have to be the files of the exact version of `@mediapipe/tasks-vision` the try-on installs.
   * @default that version in the jsDelivr CDN
   */
  wasmBaseUrl?: string;
}

/** The addresses a model is loaded from: the file of the model and the folder of the WebAssembly files. */
export interface ITryOnModelUrls {
  modelUrl: string;
  wasmBaseUrl: string;
}
