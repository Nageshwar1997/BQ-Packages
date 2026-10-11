// The root gives what `/ui`, `/layout`, `/theme` and `/toast` give, so an app can import from either
// path. It re-exports them, it does not copy them (see `tsup.config.ts`): a copy of the toast store
// would be a second store, and a toast shown through it would never reach the `ToastContainer` of the
// other path. A component that few screens use (`/auth`, `/linear-gradient`, `/resend`, `/stepper`)
// has a path of its own and is not here.
export * from './layout/index.js';
export * from './theme/index.js';
export * from './toast/index.js';
export type * from './types/component.js';
export * from './ui/index.js';
