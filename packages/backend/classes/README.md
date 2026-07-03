# @beautinique/backend-classes

Backend classes for Beautinique project.

## Installation

```bash
npm install @beautinique/backend-classes
```

## Usage

```ts
import {} from '@beautinique/backend-classes';
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


## Usage

# Error Handling Guide

## Overview

The application uses custom error classes to provide consistent, predictable, and type-safe error handling across the entire backend.

Every custom error extends the `AppError` base class.

```ts
throw new NotFoundError('Product not found.');
```

instead of

```ts
throw new AppError({
  message: 'Product not found.',
  code: 'NOT_FOUND',
});
```

Using specialized error classes makes the code more readable and allows the global error handler to produce consistent API responses.


# Error Hierarchy

```text
AppError
│
├── BadRequestError
├── ValidationError
├── AuthenticationError
├── AuthorizationError
├── NotFoundError
├── MethodNotAllowedError
├── RequestTimeoutError
├── ConflictError
├── GoneError
├── PreconditionFailedError
├── PayloadTooLargeError
├── UnsupportedMediaTypeError
├── UnprocessableEntityError
├── TooManyRequestsError
│
├── InternalServerError
├── NotImplementedError
├── BadGatewayError
├── ServiceUnavailableError
├── GatewayTimeoutError
│
├── DatabaseError
├── ExternalServiceError
├── ConfigurationError
└── UnknownError
```


# Client Errors (4xx)

These errors indicate that the client sent an invalid request.

## BadRequestError (400)

Use when the request is logically invalid even though the request format is correct.

Typical use cases

• Invalid business rule
• Invalid application state
• Operation is not allowed

Examples

```ts
throw new BadRequestError('Order cannot be cancelled.');
```

```ts
throw new BadRequestError('Coupon cannot be applied.');
```

## ValidationError (422)

Use when request validation fails.

Typical use cases

• Zod validation
• Joi validation
• Yup validation
• Invalid request body
• Invalid query parameters
• Invalid path parameters

Examples

```ts
throw new ValidationError('Validation failed.', {
  fieldErrors: {
    email: ['Email is required'],
    password: ['Password must contain at least 8 characters'],
  },
});
```

## AuthenticationError (401)

Use when the user is not authenticated.

Typical use cases

• Missing access token
• Invalid token
• Expired token
• Invalid refresh token

Examples

```ts
throw new AuthenticationError('Access token is missing.');
```

```ts
throw new AuthenticationError('Session expired.');
```

## AuthorizationError (403)

Use when the user is authenticated but does not have permission.

Typical use cases

• Missing role
• Missing permission
• Resource ownership violation

Examples

```ts
throw new AuthorizationError(
  'Only administrators can perform this action.',
);
```

## NotFoundError (404)

Use when the requested resource does not exist.

Typical use cases

• User not found
• Product not found
• Category not found
• Order not found

Examples

```ts
throw new NotFoundError('Product not found.');
```

## MethodNotAllowedError (405)

Use when the HTTP method is not supported.

Typical use cases

• PUT not allowed
• DELETE not allowed
• PATCH not supported

Example

```ts
throw new MethodNotAllowedError();
```

## RequestTimeoutError (408)

Use when processing a request exceeds the allowed timeout.

Typical use cases

• Long-running operation
• Request processing timeout

Example

```ts
throw new RequestTimeoutError();
```

## ConflictError (409)

Use when the requested operation conflicts with the current resource state.

Typical use cases

• Duplicate email
• Duplicate username
• Duplicate SKU
• Product already published

Examples

```ts
throw new ConflictError('Email already exists.');
```

## GoneError (410)

Use when the resource existed previously but has been permanently removed.

Typical use cases

• Expired invitation
• Permanently deleted resource
• Expired download link

Example

```ts
throw new GoneError('Invitation has expired.');
```

## PreconditionFailedError (412)

Use when request preconditions are not satisfied.

Typical use cases

• ETag mismatch
• Version conflict
• Required state not satisfied

Example

```ts
throw new PreconditionFailedError(
  'The resource has been modified.',
);
```

## PayloadTooLargeError (413)

Use when uploaded content exceeds the configured limit.

Typical use cases

• Image too large
• Video too large
• Large request body

Example

```ts
throw new PayloadTooLargeError(
  'Maximum image size is 2 MB.',
);
```

## UnsupportedMediaTypeError (415)

Use when uploaded media type is not supported.

Typical use cases

• Invalid image format
• Invalid video format
• Unsupported Content-Type

Example

```ts
throw new UnsupportedMediaTypeError(
  'Only JPG and PNG files are supported.',
);
```

## UnprocessableEntityError (422)

Use when the request is syntactically correct but cannot be processed due to semantic issues.

Typical use cases

• Domain-specific validation
• Business validation
• Invalid state transition

Example

```ts
throw new UnprocessableEntityError(
  'The order cannot be processed.',
);
```

## TooManyRequestsError (429)

Use when rate limits are exceeded.

Typical use cases

• OTP limit exceeded
• Login attempts exceeded
• API rate limiting

Example

```ts
throw new TooManyRequestsError(
  'Too many OTP requests.',
);
```

# Server Errors (5xx)

These errors indicate failures inside the server or dependent infrastructure.

## InternalServerError (500)

Use for unexpected server failures.

Typical use cases

• Unexpected exception
• Unknown server issue

Example

```ts
throw new InternalServerError();
```

## NotImplementedError (501)

Use for features that are intentionally not implemented yet.

Example

```ts
throw new NotImplementedError(
  'This feature is not implemented yet.',
);
```

## BadGatewayError (502)

Use when another internal service returns an invalid response.

Typical use cases

• Invalid microservice response
• Invalid upstream gateway response

Example

```ts
throw new BadGatewayError(
  'User service returned an invalid response.',
);
```

## ServiceUnavailableError (503)

Use when a service is temporarily unavailable.

Typical use cases

• Maintenance mode
• Redis unavailable
• Dependency unavailable

Example

```ts
throw new ServiceUnavailableError(
  'The service is temporarily unavailable.',
);
```

## GatewayTimeoutError (504)

Use when an upstream service fails to respond within the allowed timeout.

Typical use cases

• Payment service timeout
• User service timeout

Example

```ts
throw new GatewayTimeoutError(
  'Payment service timeout.',
);
```

# Infrastructure Errors

These classes represent failures in application infrastructure rather than HTTP semantics.

## DatabaseError

Use for database-related failures.

Typical use cases

• MongoDB errors
• PostgreSQL errors
• Prisma errors
• Redis database operations
• Transaction failures

Example

```ts
try {
  await User.create(data);
} catch (error) {
  throw new DatabaseError(
    'Failed to create user.',
    {
      cause: error,
    },
  );
}
```

## ExternalServiceError

Use for failures from third-party services.

Typical use cases

• Cloudinary
• Stripe
• Razorpay
• AWS S3
• SMTP
• Firebase

Example

```ts
try {
  await uploadImage();
} catch (error) {
  throw new ExternalServiceError(
    'Cloudinary upload failed.',
    {
      cause: error,
    },
  );
}
```

## ConfigurationError

Use when the application configuration is invalid.

Typical use cases

• Missing environment variables
• Invalid configuration
• Startup configuration failure

Example

```ts
if (!process.env.JWT_SECRET) {
  throw new ConfigurationError(
    'JWT_SECRET environment variable is missing.',
  );
}
```

## UnknownError

Use only when an unexpected error must be wrapped before rethrowing.

Typical use cases

• Unknown exception
• Non-AppError exceptions

Example

```ts
try {
  // ...
} catch (error) {
  throw new UnknownError(undefined, {
    cause: error,
  });
}
```

# Best Practices

Always throw the most specific error class available.

✅ Good

```ts
throw new NotFoundError('Product not found.');
```

❌ Avoid

```ts
throw new InternalServerError('Product not found.');
```

Always include meaningful messages.

Prefer using `ValidationError` for schema validation.

Use `ConflictError` for duplicate resources.

Use `AuthenticationError` for authentication failures.

Use `AuthorizationError` for permission failures.

Wrap infrastructure failures using `DatabaseError` or `ExternalServiceError` and preserve the original error using `cause`.

Avoid throwing `AppError` directly. Always use one of the specialized error classes.

Allow unexpected exceptions to bubble up to the global error handler whenever possible instead of swallowing them.
