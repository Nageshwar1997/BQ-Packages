import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import type { DestinationStream } from 'pino';

/** Pino's numeric level for `error` (and, implicitly, `fatal` which is higher). */
const ERROR_LEVEL = 50;
/** Pino's numeric level for `warn`. */
const WARN_LEVEL = 40;

interface ParsedLogLine {
  level?: number;
  req?: unknown;
}

/**
 * Builds a Pino destination that splits log lines into separate files
 * under `logsDir`:
 *
 *  - `request.log` - every log line carrying a `req` binding, i.e. every
 *    HTTP request/response log produced by the HTTP logger (and any log
 *    emitted via `req.log` while handling that request) - regardless of
 *    its level. A complete, chronological HTTP traffic trail.
 *  - `error.log` - every `error`/`fatal` level log line.
 *  - `warning.log` - every `warn` level log line.
 *  - `success.log` - everything else (`info`/`debug`/`trace`) that is NOT
 *    already part of an HTTP request (plain application messages).
 *
 * A request-tied log at `warn`/`error` level is written to BOTH
 * `request.log` (so the request's full trail stays intact) AND the
 * matching level file (so `error.log`/`warning.log` surface it without
 * having to scan all traffic). A request-tied `info`-level (successful)
 * log is written only to `request.log`, to avoid flooding `success.log`
 * with routine request traffic.
 *
 * Deliberately simple: plain, always-open, append-only file streams - no
 * worker threads, log rotation, or external transport dependency. See the
 * package roadmap for more advanced file/cloud transports.
 *
 * @param logsDir - Directory to create (if missing) and write log files into.
 * @returns A Pino-compatible destination stream.
 */
export function createFileLogRouter(logsDir: string): DestinationStream {
  mkdirSync(logsDir, { recursive: true });

  const openLogFile = (fileName: string) =>
    createWriteStream(join(logsDir, fileName), { flags: 'a' });

  const files = {
    request: openLogFile('request.log'),
    error: openLogFile('error.log'),
    warning: openLogFile('warning.log'),
    success: openLogFile('success.log'),
  };

  for (const file of Object.values(files)) {
    file.on('error', (error: Error) => {
      // A file-logging failure (disk full, permissions, ...) must never
      // crash the process or silently take down application logging.
      console.error('[backend-logger] failed to write log file:', error);
    });
  }

  return {
    write(msg: string) {
      let parsed: ParsedLogLine;

      try {
        parsed = JSON.parse(msg) as ParsedLogLine;
      } catch {
        // Should never happen with Pino-generated NDJSON, but a malformed
        // line must still land somewhere rather than being dropped.
        files.success.write(msg);
        return;
      }

      const isRequestLog = parsed.req !== undefined;

      if (isRequestLog) {
        files.request.write(msg);
      }

      if (typeof parsed.level === 'number' && parsed.level >= ERROR_LEVEL) {
        files.error.write(msg);
      } else if (parsed.level === WARN_LEVEL) {
        files.warning.write(msg);
      } else if (!isRequestLog) {
        files.success.write(msg);
      }
    },
  };
}
