import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import { connectDB, pingDB } from "./config/db.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { AppError } from "./utils/AppError.js";
import { aiEnabled } from "./services/ai/aiClient.js";

const app = express();
app.use(helmet());
const allowedOrigins = new Set([
  env.clientOrigin,
  "https://bookleaf-rouge.vercel.app",
  "http://localhost:5173",
]);
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
}));
app.use(express.json({ limit: "100kb" }));
if (!env.isProd) app.use(morgan("dev"));

app.get("/api/health", async (_req, res) => {
  try {
    await pingDB();
    res.json({ status: "ok", database: "ok", ai: aiEnabled() ? "configured" : "disabled" });
  } catch {
    res.status(503).json({ status: "error", database: "unavailable", ai: aiEnabled() ? "configured" : "disabled" });
  }
});

app.use("/api", async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch {
    next(new AppError(503, "Database unavailable", "DATABASE_UNAVAILABLE"));
  }
}, routes);
app.use("/api", notFound);

// Optional: serve the built React app from the same service (single-deploy on Render/Railway).
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use(errorHandler);
export default app;
