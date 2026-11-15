import { loadConfig, type AppConfig } from "./core/config";
import type { AIProvider } from "./core/ports/ai";
import { d1Db } from "./adapters/db/d1";
import { kvCache } from "./adapters/cache/kv";
import { firebaseAuth } from "./adapters/auth/firebase";
import { geminiAI } from "./adapters/ai/gemini";
import { openAICompatibleAI } from "./adapters/ai/openai-compatible";

// The ONE place that decides which AI is used.
function buildAI(config: AppConfig): AIProvider | null {
  if (!config.AI_API_KEY) return null;
  switch (config.AI_PROVIDER) {
    case "gemini":
      return geminiAI({ apiKey: config.AI_API_KEY, model: config.AI_MODEL });
    case "qwen":
      return openAICompatibleAI({
        apiKey: config.AI_API_KEY,
        model: config.AI_MODEL,
        baseUrl: config.AI_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      });
  }
}

export function buildContainer(env: Record<string, unknown>) {
  const config = loadConfig(env);
  return {
    config,
    db: d1Db(env.DB as D1Database),
    cache: kvCache(env.CACHE as KVNamespace),
    auth: firebaseAuth(config.FIREBASE_PROJECT_ID),
    ai: buildAI(config),
  };
}