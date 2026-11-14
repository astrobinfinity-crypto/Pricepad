import { z } from "zod";
import type { DbPort } from "../ports/db";
import { AppError } from "../errors";

const MAX_LISTS_PER_USER = 20; // protects your costs; we'll tie this to plans later

export const createListInput = z.object({
  title: z.string().trim().min(1).max(100),
  columns: z
    .array(z.string().trim().min(1).max(40))
    .min(1)
    .max(8)
    .default(["Item", "Unit", "MRP", "Our Price"]),
});

export type CreateListInput = z.infer<typeof createListInput>;

function makeSlug(title: string) {
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "list";
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => (b % 36).toString(36))
    .join("");
  return `${base}-${rand}`;
}

export async function createListForUser(db: DbPort, userId: string, input: CreateListInput) {
  const existing = await db.listListsByOwner(userId);
  if (existing.length >= MAX_LISTS_PER_USER) {
    throw new AppError(403, "List limit reached");
  }
  return db.createList(userId, input.title, makeSlug(input.title), input.columns);
}