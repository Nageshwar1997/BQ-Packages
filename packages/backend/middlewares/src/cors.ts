/**
 * @beautinique/backend-middlewares/cors
 *
 * `corsMiddleware`, kept as a separate entry point (rather than bundled
 * into the base entry) specifically so `cors`'s types are only ever
 * resolved by a consumer that actually imports from here. See the base
 * entry (`@beautinique/backend-middlewares`) for why.
 */
export * from './middlewares/cors.js';
export type { ICorsOptions } from './types/cors.js';
