import { z } from "zod";

const schema = z.object({
  AI_PROVIDER: z.enum(["gemini", "qwen"]).default("gemini"),
  AI_MODEL: z.string().min(1),
  AI_API_KEY: z.string().min(1).optional(), // secret, in .dev.vars; the app still works without it
  AI_BASE_URL: z.string().url().optional(), // only needed for Qwen
  FIREBASE_PROJECT_ID: z.string().min(1),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: Record<string, unknown>): AppConfig {
  return schema.parse(env);
}