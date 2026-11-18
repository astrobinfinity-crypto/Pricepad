import { z } from "zod";

const schema = z.object({
  AI_PROVIDER: z.enum(["gemini", "qwen"]).default("gemini"),
  AI_MODEL: z.string().min(1),
  AI_API_KEY: z.string().min(1).optional(),
  AI_BASE_URL: z.string().url().optional(),
  ACCESS_SECRET: z.string().min(32).optional(), // signs PIN-access cookies (secret)
  FIREBASE_PROJECT_ID: z.string().min(1),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: Record<string, unknown>): AppConfig {
  return schema.parse(env);
}