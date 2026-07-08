/**
 * @beautinique/backend-middlewares/session
 *
 * `tryCatchSession`, kept as a separate entry point (rather than bundled
 * into the base entry) specifically so `mongoose`'s types are only ever
 * resolved by a consumer that actually imports from here - e.g. a
 * microservice with its own MongoDB connection, but NOT a database-less
 * API gateway. See the base entry (`@beautinique/backend-middlewares`)
 * for why.
 */
import './types/globals.js';

export * from './middlewares/response/tryCatchSession.js';
export type { TAsyncSessionRequestHandler } from './types/session.js';
