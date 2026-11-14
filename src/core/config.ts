import { z } from "zod";

// Every setting the app reads. If one is missing or wrong, we fail early with a clear error.
const schema = z.object({
  AI_PROVIDER: z.enum(["gemini", "qwen"]).default("gemini"),
  AI_MODEL: z.string().min(1),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: Record<string, unknown>): AppConfig {
  return schema.parse(env);
}