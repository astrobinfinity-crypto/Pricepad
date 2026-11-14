import { loadConfig } from "./core/config";
import { d1Db } from "./adapters/db/d1";

export function buildContainer(env: Record<string, unknown>) {
  const config = loadConfig(env);
  return {
    config,
    db: d1Db(env.DB as D1Database),
  };
}