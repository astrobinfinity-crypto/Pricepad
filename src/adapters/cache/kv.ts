import type { CachePort } from "../../core/ports/cache";

export function kvCache(kv: KVNamespace): CachePort {
  return {
    get: (key) => kv.get(key),
    put: (key, value, ttlSeconds) =>
      kv.put(key, value, ttlSeconds ? { expirationTtl: ttlSeconds } : undefined),
    delete: (key) => kv.delete(key),
  };
}