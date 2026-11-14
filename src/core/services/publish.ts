import { z } from "zod";
import type { DbPort } from "../ports/db";
import type { CachePort } from "../ports/cache";
import { AppError } from "../errors";

export type PublishedList = {
  title: string;
  columns: string[];
  rows: string[][];
  whatsapp: string;
  publishedAt: number;
};

// Accepts "98765 43210" or "+91 98765 43210". A bare 10-digit number is treated as Indian.
export const publishInput = z.object({
  whatsapp: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s\-+()]/g, ""))
    .pipe(z.string().regex(/^\d{10,15}$/))
    .transform((d) => (d.length === 10 ? "91" + d : d)),
});

const SLUG_PATTERN = /^[a-z0-9-]{3,60}$/;
const keyFor = (slug: string) => `pub:${slug}`;

type Deps = { db: DbPort; cache: CachePort };

export async function publishList(c: Deps, userId: string, listId: string, whatsapp: string) {
  const list = await c.db.getListForOwner(userId, listId);
  if (!list) throw new AppError(404, "Not found");

  const rows = await c.db.listItems(list.id);
  if (rows.length === 0) throw new AppError(400, "Add at least one item before publishing");

  const publishedAt = Math.floor(Date.now() / 1000);
  const snapshot: PublishedList = { title: list.title, columns: list.columns, rows, whatsapp, publishedAt };

  await c.cache.put(keyFor(list.slug), JSON.stringify(snapshot));
  await c.db.setPublication(userId, listId, publishedAt, whatsapp);
}

export async function unpublishList(c: Deps, userId: string, listId: string) {
  const list = await c.db.getListForOwner(userId, listId);
  if (!list) throw new AppError(404, "Not found");
  await c.cache.delete(keyFor(list.slug));
  await c.db.setPublication(userId, listId, null, null);
}

// Used by the public page. Reads only the cache, never the database.
export async function getPublishedList(cache: CachePort, slug: string): Promise<PublishedList | null> {
  if (!SLUG_PATTERN.test(slug)) return null; // never use unchecked text as a cache key
  const raw = await cache.get(keyFor(slug));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublishedList;
  } catch {
    return null;
  }
}