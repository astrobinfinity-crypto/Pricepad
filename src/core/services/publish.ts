import { z } from "zod";
import type { DbPort } from "../ports/db";
import type { CachePort } from "../ports/cache";
import { AppError } from "../errors";
import { PLANS } from "../plans";
import { getPlanFor, limitError } from "../policy";

export type PublishedList = {
  title: string;
  columns: string[];
  rows: string[][];
  whatsapp: string;
  publishedAt: number;
  showBranding?: boolean;
  /** When the plan this snapshot was published under ends. After that, Free limits apply. */
  expiresAt?: number | null;
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

  const plan = await getPlanFor(c.db, userId);

  const day = new Date().toISOString().slice(0, 10);
  if (!(await c.db.claimPublishSlot(userId, listId, day, plan.limits.publishesPerDay))) {
    throw limitError(
      `You can publish this list ${plan.limits.publishesPerDay} times a day on the ${plan.limits.label} plan. Try again tomorrow, or see Plans.`
    );
  }

  const publishedAt = Math.floor(Date.now() / 1000);
  const snapshot: PublishedList = {
    title: list.title,
    columns: list.columns,
    rows: rows.slice(0, plan.limits.itemsPerList), // never publish more than the plan allows
    whatsapp,
    publishedAt,
    showBranding: plan.limits.branding,
    expiresAt: plan.name === "free" ? null : plan.until,
  };

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

// When the plan has ended, show only what the Free plan allows. Nothing is deleted,
// and renewing restores everything. Runs on every page view with no database call.
export function viewOf(list: PublishedList, now = Math.floor(Date.now() / 1000)): PublishedList {
  if (list.expiresAt && now > list.expiresAt) {
    return { ...list, rows: list.rows.slice(0, PLANS.free.itemsPerList), showBranding: true };
  }
  return list;
}