import { AppError } from "../utils/AppError.js";

/** Validates req[source] with a zod schema and replaces it with the parsed value. */
export const validate = (schema, source = "body") => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return next(new AppError(422, "Validation failed", "VALIDATION_ERROR", details));
  }
  req[source] = result.data;
  next();
};
