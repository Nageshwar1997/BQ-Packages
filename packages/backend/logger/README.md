# @beautinique/backend-logger

Framework-agnostic, production-ready logging for Beautinique backend services and microservices, built on [Pino](https://getpino.io) and [pino-http](https://github.com/pinojs/pino-http).

- Secure by default - credentials, tokens, and cookies are always redacted, in every environment.
- Fast - raw JSON to `stdout` in production, no unnecessary allocations or blocking I/O.
- One shape everywhere - the same request/response/error serializers and log-level mapping across every service, so Loki/Grafana queries stay consistent.
- Works anywhere - CLIs, workers, cron jobs, background queues, and HTTP servers (Express, Fastify, or plain `node:http`).

## Installation

```bash
npm install @beautinique/backend-logger
```

If you want human-readable output in development (`pretty: true`), also install `pino-pretty` in the service that needs it:

```bash
npm install -D pino-pretty
```

`pino-pretty` is an optional peer dependency - it is only ever loaded when `pretty` is enabled, so production installs don't pay for it.


## Core logger - `createLogger`

`createLogger` returns a fully configured Pino `Logger`. Use it anywhere - HTTP servers, CLIs, workers, cron jobs, background queues:

```ts
const logger = createLogger({
  service: 'orders-worker',
  pretty: true,
  context: { region: 'ap-south-1' }, // extra static fields on every log line
});

logger.info('Worker started');
logger.error({ err: someError }, 'Job failed');
```

| Option    | Default                         | Description                                                                                                      |
| --------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `service` | _(required)_                    | Tags every log line - use this to filter/group logs per service in Grafana.                                      |
| `pretty`  | `process.env.IS_DEV === 'true'` | Human-readable, colorized output via `pino-pretty`. Also controls whether error stack traces are included.       |
| `context` | `undefined`                     | Extra static fields merged into every log line.                                                                  |
| `redact`  | `undefined`                     | Extra redact paths, additively merged with the built-in secure defaults (see below). Cannot remove the defaults. |
| ...       |                                 | Any other native Pino `LoggerOptions` (`level`, `formatters`, `hooks`, ...) are passed straight through.         |

A ready-to-use default instance (`service: "app"`) is also exported for quick scripts:

```ts
import { logger } from '@beautinique/backend-logger';
```

## HTTP logger - `createHttpLogger`

`createHttpLogger` returns `pino-http` middleware. It is intentionally **independent** from `createLogger`'s own configuration (it has its own `pretty`/body-logging behaviour) while writing through the same Pino instance you pass it:

```ts
const logger = createLogger({ service: 'gateway' });

app.use(
  createHttpLogger({
    logger,
    ignorePaths: ['/metrics'], // merged with the default ignore list
  }),
);
```

| Option                                                                               | Default                         | Description                                                                                                                |
| ------------------------------------------------------------------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `logger`                                                                             | _(required)_                    | The Pino instance to attach request/response logs to.                                                                      |
| `pretty`                                                                             | `process.env.IS_DEV === 'true'` | Enables development-only behaviour (currently: logging the parsed request body).                                           |
| `ignorePaths`                                                                        | `undefined`                     | Extra paths to exclude from auto-logging, merged with `/health`, `/favicon.ico`, `/robots.txt`.                            |
| `autoLogging`                                                                        | enabled                         | Pass `false` to disable entirely, or `{ ignore }` - your predicate is combined with the default ignore list, not replaced. |
| `customProps` / `customReceivedObject` / `customSuccessObject` / `customErrorObject` | -                               | If supplied, merged on top of this package's own structured output (e.g. `requestId`) rather than replacing it.            |

Always enforced (not configurable), so every service produces the same log shape:

- **Request ID**: reuses an inbound `x-request-id` header, or generates one with `crypto.randomUUID()`. Available as `requestId` on every request/success/error log line.
- **Log level mapping**: 2xx/3xx → `info`, 4xx → `warn`, 5xx or an unhandled error → `error`.
- **Serializers**: the secure request/response/error serializers described below.
- **Success message format**: `"Request completed with status <code>"`.

## Serializers

- **Request** - `id`, `method`, `url`, `query`, `params`, `ip`, `remoteAddress`, `remotePort`, `userAgent`. Raw headers are never included. `body` is only included when `pretty` is enabled.
- **Response** - `statusCode` only.
- **Error** - recursively serializes `Error.cause` chains and `AggregateError.errors`, is circular-reference safe (via a `WeakSet` recursion guard), and never throws - any thrown value (not just `Error` instances) is normalized into one first. Stack traces are stripped unless `pretty` is enabled.

## Redaction

These paths are always redacted, in every environment, and cannot be disabled - only extended via the `redact` option:

- `req.headers.authorization`, `req.headers.cookie`, `req.headers["x-api-key"]`
- `password`, `confirmPassword`, `token`, `accessToken`, `refreshToken` - at the top level, and under `body.*` / `req.body.*` (where a logged request body ends up nested).

```ts
createLogger({
  service: 'gateway',
  redact: { paths: ['user.ssn'] }, // merged with the defaults above
});
```

## Repository

https://github.com/Nageshwar1997/BQ-Packages

## Homepage

https://github.com/Nageshwar1997/BQ-Packages

## Issues

https://github.com/Nageshwar1997/BQ-Packages/issues

## Author

Nageshwar Pawar

## License

This package is licensed under the MIT License. See the root `LICENSE` file for details.
