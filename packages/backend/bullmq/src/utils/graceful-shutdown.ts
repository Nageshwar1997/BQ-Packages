import type { TLogger } from '../types/index.js';

/** Anything with a BullMQ-style `close()` - matches both `JobProducer` and `JobWorker`. */
export interface IClosable {
  close: (force?: boolean) => Promise<void>;
}

export interface IGracefulShutdownOptions {
  /** @default ['SIGTERM', 'SIGINT'] */
  signals?: NodeJS.Signals[];
  logger?: TLogger;
  /** Called after every closable has closed (or on close failure), before `process.exit`. */
  onShutdown?: (signal: NodeJS.Signals) => void | Promise<void>;
}

/**
 * Opt-in helper that closes every given `JobProducer`/`JobWorker` on
 * `SIGTERM`/`SIGINT` before the process exits, so an in-flight job isn't
 * abandoned mid-processing during a deploy/restart.
 *
 * Deliberately **not** wired automatically inside `JobProducer`/`JobWorker`
 * themselves: a reusable library class registering global `process` signal
 * handlers (and calling `process.exit`) as a side effect of construction
 * would surprise a service that already manages its own shutdown sequencing
 * (e.g. alongside an HTTP server). Call this once, explicitly, wherever a
 * process owns the producers/workers it creates.
 *
 * @example
 * ```ts
 * const producer = new JobProducer({ connection, logger });
 * const worker = new JobWorker({ queueName: 'mail-queue', connection, logger, handlers });
 *
 * registerGracefulShutdown([producer, worker], { logger });
 * ```
 */
export function registerGracefulShutdown(
  closables: readonly IClosable[],
  options: IGracefulShutdownOptions = {},
): void {
  const signals = options.signals ?? ['SIGTERM', 'SIGINT'];
  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    options.logger?.info({ signal }, 'Received shutdown signal, closing BullMQ connections...');

    void Promise.all(closables.map((closable) => closable.close()))
      .then(async () => {
        await options.onShutdown?.(signal);
        options.logger?.info({ signal }, 'BullMQ connections closed.');
        process.exit(0);
      })
      .catch((error: unknown) => {
        options.logger?.error({ signal, err: error }, 'Error while closing BullMQ connections.');
        process.exit(1);
      });
  };

  for (const signal of signals) {
    process.once(signal, shutdown);
  }
}
