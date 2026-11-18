import type { CachePort } from "../ports/cache";
import { AppError } from "../errors";
import { pinStamp, signAccess, verifyAccess, verifyPin } from "../crypto";
import { SLUG_PATTERN, privKey, type PrivateEntry, type PublishedList } from "./publish";

export const ACCESS_TTL_SECONDS = 30 * 24 * 60 * 60; // visitors stay unlocked for 30 days
const WINDOW_SECONDS = 15 * 60;
const MAX_FAILS_PER_VISITOR = 5;
const MAX_FAILS_PER_LIST = 40;

export const accessCookieName = (slug: string) => `pp_${slug}`;

async function readPrivate(cache: CachePort, slug: string): Promise<PrivateEntry | null> {
  const raw = await cache.get(privKey(slug));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PrivateEntry;
  } catch {
    return null;
  }
}

// Checks the PIN. Returns a signed access token on success.
export async function unlockList(cache: CachePort, secret: string, slug: string, pin: string, ip: string) {
  if (!SLUG_PATTERN.test(slug)) throw new AppError(404, "Not found");

  const visitorKey = `rl:ip:${slug}:${ip}`;
  const listKey = `rl:list:${slug}`;
  const [visitorFails, listFails] = (await Promise.all([cache.get(visitorKey), cache.get(listKey)])).map((v) =>
    Number(v ?? "0")
  );
  if (visitorFails >= MAX_FAILS_PER_VISITOR || listFails >= MAX_FAILS_PER_LIST) {
    throw new AppError(429, "Too many attempts. Please try again in 15 minutes.");
  }

  const entry = await readPrivate(cache, slug);
  if (!entry) throw new AppError(404, "Not found");

  if (!(await verifyPin(pin, entry.pinHash))) {
    await Promise.all([
      cache.put(visitorKey, String(visitorFails + 1), WINDOW_SECONDS),
      cache.put(listKey, String(listFails + 1), WINDOW_SECONDS),
    ]);
    throw new AppError(401, "Wrong PIN");
  }
  return signAccess(secret, slug, pinStamp(entry.pinHash), ACCESS_TTL_SECONDS);
}

// Returns the full list only if the visitor's cookie is valid for the CURRENT PIN.
export async function getPrivateSnapshot(
  cache: CachePort,
  secret: string,
  slug: string,
  token: string
): Promise<PublishedList | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const entry = await readPrivate(cache, slug);
  if (!entry) return null;
  return (await verifyAccess(secret, token, slug, pinStamp(entry.pinHash))) ? entry.snapshot : null;
}