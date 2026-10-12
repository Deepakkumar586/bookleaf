import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, authorId: u.authorId, city: u.city });

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
    // Same message for unknown email / wrong password: don't leak which accounts exist.
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export const me = (req, res) => res.json({ user: publicUser(req.user) });
