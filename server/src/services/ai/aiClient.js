import OpenAI from "openai";
import { env } from "../../config/env.js";

/**
 * Thin wrapper around the LLM SDK (OpenAI). Responsibilities:
 *  - key lives only in server env vars
 *  - hard timeout + 1 retry (SDK handles 429/5xx backoff)
 *  - circuit breaker: after 3 consecutive failures skip AI for 60s so a provider
 *    outage doesn't add latency to every request
 *  - normalises every failure into AIUnavailableError (callers degrade gracefully)
 */
export class AIUnavailableError extends Error {
  constructor(message, reason = "UNAVAILABLE") {
    super(message);
    this.name = "AIUnavailableError";
    this.reason = reason;
  }
}

const client = env.openaiKey
  ? new OpenAI({ apiKey: env.openaiKey, baseURL: env.aiBaseUrl, timeout: 20_000, maxRetries: 1 })
  : null;

const breaker = { failures: 0, openUntil: 0 };
const FAILURE_LIMIT = 3;
const COOLDOWN_MS = 60_000;

export const aiEnabled = () => Boolean(client);

export async function complete({ system, user, maxTokens = 400, temperature = 0.3 }) {
  if (!client) throw new AIUnavailableError("AI is not configured (no API key)", "NO_API_KEY");
  if (breaker.openUntil > Date.now()) {
    throw new AIUnavailableError("AI temporarily paused after repeated failures", "CIRCUIT_OPEN");
  }

  try {
    const res = await client.chat.completions.create({
      model: env.aiModel,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: system }, // OpenAI caches repeated prompt prefixes automatically
        { role: "user", content: user },
      ],
    });
    breaker.failures = 0;
    const text = (res.choices[0]?.message?.content || "").trim();
    // Normalise usage to the shape the rest of the app expects.
    const usage = { input_tokens: res.usage?.prompt_tokens ?? 0, output_tokens: res.usage?.completion_tokens ?? 0 };
    console.log(`[ai] ${res.model} in=${usage.input_tokens} out=${usage.output_tokens}`);
    return { text, model: res.model, usage };
  } catch (err) {
    const noCredit = err.code === "insufficient_quota";
    const transient = !err.status || (err.status === 429 && !noCredit) || err.status >= 500;
    if (transient && ++breaker.failures >= FAILURE_LIMIT) breaker.openUntil = Date.now() + COOLDOWN_MS;
    const reason = noCredit ? "NO_CREDIT" : err.status === 429 ? "RATE_LIMITED" : err.status >= 500 ? "PROVIDER_DOWN" : "REQUEST_FAILED";
    console.error(`[ai] call failed (${reason}):`, err.message);
    throw new AIUnavailableError("AI service is currently unavailable", reason);
  }
}