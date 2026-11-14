import { loadConfig } from "./core/config";
import { d1Db } from "./adapters/db/d1";
import { kvCache } from "./adapters/cache/kv";
import { firebaseAuth } from "./adapters/auth/firebase";

export function buildContainer(env: Record<string, unknown>) {
  const config = loadConfig(env);
  return {
    config,
    db: d1Db(env.DB as D1Database),
    cache: kvCache(env.CACHE as KVNamespace),
    auth: firebaseAuth(config.FIREBASE_PROJECT_ID),
  };
}