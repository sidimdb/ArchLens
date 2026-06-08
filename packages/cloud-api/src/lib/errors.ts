/**
 * Typed errors → consistent HTTP responses.
 *
 * Routes throw these; the global error handler in index.ts catches
 * them and serializes to JSON with the right status code. Anything
 * that isn't one of these becomes a 500 with a generic message
 * (the actual error is still logged server-side).
 */

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, "bad_request", message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Invalid or missing project key.") {
    super(401, "unauthorized", message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, "not_found", message);
  }
}

export class InternalError extends ApiError {
  constructor(message = "Internal server error.") {
    super(500, "internal", message);
  }
}
