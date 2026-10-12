import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import app from "./app.js";

connectDB()
  .then(() => app.listen(env.port, () => console.log(`API listening on :${env.port}`)))
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
