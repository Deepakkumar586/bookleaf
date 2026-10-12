import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

/** Verifies the Bearer token and attaches the current user to req.user. */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new AppError(401, "Authentication required", "UNAUTHENTICATED");

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw new AppError(401, "Invalid or expired token", "INVALID_TOKEN");
    }
    const user = await User.findById(payload.sub).lean();
    if (!user) throw new AppError(401, "Account no longer exists", "INVALID_TOKEN");
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Role-based access control. Usage: requireRole("admin") */
export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role)
    ? next()
    : next(new AppError(403, "You do not have permission to perform this action", "FORBIDDEN"));
