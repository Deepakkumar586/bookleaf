import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { aiEnabled } from "./services/ai/aiClient.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: "100kb" }));
if (!env.isProd) app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ status: "ok", ai: aiEnabled() ? "configured" : "disabled" }));
app.use("/api", routes);
app.use("/api", notFound);

// Optional: serve the built React app from the same service (single-deploy on Render/Railway).
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use(errorHandler);
export default app;
