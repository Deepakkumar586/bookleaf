import "dotenv/config";

const required = ["MONGODB_URI", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  clientOrigin: process.env.CLIENT_ORIGIN || "https://bookleaf-rouge.vercel.app",
  openaiKey: process.env.OPENAI_API_KEY || "",
  aiBaseUrl: process.env.AI_BASE_URL || undefined,
  aiModel: process.env.AI_MODEL || "gpt-4o-mini",
  isProd: process.env.NODE_ENV === "production",
};
