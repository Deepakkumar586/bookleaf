import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const notFound = (req, _res, next) =>
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, "NOT_FOUND"));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let { status = 500, code = "INTERNAL_ERROR", message = "Something went wrong", details } = err;

  if (err.name === "CastError") {
    status = 400; code = "INVALID_ID"; message = "Invalid identifier";
  } else if (err.name === "ValidationError") {
    status = 422; code = "VALIDATION_ERROR"; message = "Validation failed";
  } else if (err.code === 11000) {
    status = 409; code = "DUPLICATE"; message = "Resource already exists";
  }

  if (status >= 500) {
    console.error(err);
    if (env.isProd) message = "Something went wrong";
  }
  res.status(status).json({ error: { code, message, ...(details && { details }) } });
}
