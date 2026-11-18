import { z } from "zod";
import type { DbPort } from "../ports/db";
import type { CachePort } from "../ports/cache";
import { AppError } from "../errors";
import { PLANS } from "../plans";
import { getPlanFor, limitError } from "../policy";
import { hashPin } from "../crypto";

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

// What the public sees for a PIN-protected list: no items at all.
export type LockedList = { locked: true; title: string; publishedAt: number };

// Stored under a separate key and only handed out after a correct PIN.
export type PrivateEntry = { snapshot: PublishedList; pinHash: string };

// Accepts "98765 43210" or "+91 98765 43210". A bare 10-digit number is treated as Indian.
export const publishInput = z.object({
  whatsapp: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s\-+()]/g, ""))
    .pipe(z.string().regex(/^\d{10,15}$/))
    .transform((d) => (d.length === 10 ? "91" + d : d)),
});

export const pinInput = z.object({ pin: z.string().regex(/^\d{6,12}$/) });

export const SLUG_PATTERN = /^[a-z0-9-]{3,60}$/;
export const pubKey = (slug: string) => `pub:${slug}`;
export const privKey = (slug: string) => `priv:${slug}`;

type Deps = { db: DbPort; cache: CachePort };

// Writes the snapshot in the right shape. When locking, the public copy is replaced by the
// stub FIRST, so a failure part-way never leaves the items visible.
async function writeSnapshot(cache: CachePort, slug: string, snapshot: PublishedList, pinHash: string | null) {
  if (pinHash) {
    const stub: LockedList = { locked: true, title: snapshot.title, publishedAt: snapshot.publishedAt };
    await cache.put(pubKey(slug), JSON.stringify(stub));
    const entry: PrivateEntry = { snapshot, pinHash };
    await cache.put(privKey(slug), JSON.stringify(entry));
  } else {
    await cache.put(pubKey(slug), JSON.stringify(snapshot));
    await cache.delete(privKey(slug));
  }
}

async function readFullSnapshot(cache: CachePort, slug: string): Promise<PublishedList | null> {
  const priv = await cache.get(privKey(slug));
  if (priv) {
    try {
      return (JSON.parse(priv) as PrivateEntry).snapshot;
    } catch {
      /* ignore a damaged entry */
    }
  }
  const pub = await cache.get(pubKey(slug));
  if (pub) {
    try {
      const entry = JSON.parse(pub) as PublishedList | LockedList;
      if (!("locked" in entry)) return entry;
    } catch {
      /* ignore a damaged entry */
    }
  }
  return null;
}

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

  // An existing PIN keeps protecting the list, even after a plan ends.
  const pinHash = await c.db.getPinHash(userId, listId);
  await writeSnapshot(c.cache, list.slug, snapshot, pinHash);
  await c.db.setPublication(userId, listId, publishedAt, whatsapp);
}

export async function unpublishList(c: Deps, userId: string, listId: string) {
  const list = await c.db.getListForOwner(userId, listId);
  if (!list) throw new AppError(404, "Not found");
  await c.cache.delete(pubKey(list.slug));
  await c.cache.delete(privKey(list.slug));
  await c.db.setPublication(userId, listId, null, null);
}

// Set (pin = "12345678") or remove (pin = null) the PIN. Takes effect immediately on a published list.
export async function setListPin(c: Deps, userId: string, listId: string, pin: string | null) {
  const list = await c.db.getListForOwner(userId, listId);
  if (!list) throw new AppError(404, "Not found");

  // Removing a PIN is always allowed. Setting one needs a plan that includes it.
  if (pin !== null) {
    const plan = await getPlanFor(c.db, userId);
    if (!plan.limits.pin) {
      throw limitError("PIN-protected lists are part of the Pro plan. See Plans to upgrade.");
    }
  }

  const pinHash = pin === null ? null : await hashPin(pin);

  // Cache first, then the database. If anything fails, the owner sees an error and retries.
  if (list.publishedAt) {
    const snapshot = await readFullSnapshot(c.cache, list.slug);
    if (snapshot) await writeSnapshot(c.cache, list.slug, snapshot, pinHash);
  }
  await c.db.setPinHash(userId, listId, pinHash);
}

// Used by the public page. Reads only the cache, never the database.
export async function getPublicEntry(cache: CachePort, slug: string): Promise<PublishedList | LockedList | null> {
  if (!SLUG_PATTERN.test(slug)) return null; // never use unchecked text as a cache key
  const raw = await cache.get(pubKey(slug));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublishedList | LockedList;
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