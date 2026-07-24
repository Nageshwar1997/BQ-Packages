# @beautinique/backend-cors

A reusable, production-ready CORS middleware for Express-based Node.js services, built on top of the [`cors`](https://www.npmjs.com/package/cors) package.

- Safer defaults - a sensible set of methods/headers/`maxAge` out of the box, so most services can call it with just an `origin`.
- Fails fast - rejects `credentials: true` combined with `origin: '*'`/`true` at setup time, instead of a confusing runtime CORS failure.
- Observable - an optional `onOriginDenied` hook fires whenever a request's `Origin` doesn't match your allowlist, for logging/alerting.

## Installation

```bash
npm install @beautinique/backend-cors
```

`express` is a peer dependency - install whichever version your service already uses.

## Usage

```ts
import { checkCors } from '@beautinique/backend-cors';

app.use(
  checkCors({
    origin: ['https://app.example.com', 'https://admin.example.com'],
    credentials: true,
    onOriginDenied: (origin) => logger.warn({ origin }, 'CORS: origin denied'),
  }),
);
```

`checkCors` accepts any `cors` `CorsOptions`, plus the `onOriginDenied` hook - any option you omit falls back to this package's defaults below, not `cors`'s own.

| Option           | Default                                                | Description                                                                                                                                                           |
| ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `origin`         | `cors`'s default (`*`)                                 | String, `RegExp`, array, `boolean`, or a custom `(origin, callback)` matcher. Required in practice whenever `credentials: true` is used.                              |
| `credentials`    | `false`                                                | Rejected at setup time if combined with `origin: '*'`/`true` - browsers reject that combination outright.                                                             |
| `methods`        | `['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']` |                                                                                                                                                                       |
| `allowedHeaders` | `['Content-Type', 'Authorization']`                    |                                                                                                                                                                       |
| `exposedHeaders` | `['X-Request-Id']`                                     |                                                                                                                                                                       |
| `maxAge`         | `600` (10 minutes)                                     | How long, in seconds, browsers may cache a preflight response.                                                                                                        |
| `onOriginDenied` | `undefined`                                            | Called with the denied `Origin` header. Only fires for static `origin` values (string/`RegExp`/`boolean`/array) - a custom matcher function already has full control. |

The request is never rejected outright because of a denied origin - CORS headers are simply omitted, and it's the browser (not this middleware) that blocks the response from being read cross-origin.

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
