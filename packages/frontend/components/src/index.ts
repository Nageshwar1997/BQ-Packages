// The root gives what `/ui` and `/toast` give, so an app can import from either path. It re-exports
// them, it does not copy them (see `tsup.config.ts`): a copy of the toast store would be a second
// store, and a toast shown through it would never reach the `ToastContainer` of the other path.
export * from './toast/index.js';
export type * from './types/component.js';
export * from './ui/index.js';
