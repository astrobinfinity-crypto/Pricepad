import { loadConfig } from "./core/config";

// The ONE place that decides which vendor is used for each job.
// Later steps add: db, cache, auth, ai, payments here.
export function buildContainer(env: Record<string, unknown>) {
  const config = loadConfig(env);
  return { config };
}