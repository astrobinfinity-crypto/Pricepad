import { z } from "zod";
import type { DbPort } from "../ports/db";
import { AppError } from "../errors";

export const saveListInput = z
  .object({
    title: z.string().trim().min(1).max(100),
    columns: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
    rows: z.array(z.array(z.string().trim().max(200))).max(5000),
  })
  .refine((d) => d.rows.every((r) => r.length === d.columns.length), {
    message: "Every row must have one value per column",
  });

export type SaveListInput = z.infer<typeof saveListInput>;

export async function getListWithItems(db: DbPort, userId: string, listId: string) {
  const list = await db.getListForOwner(userId, listId);
  if (!list) throw new AppError(404, "Not found");
  const rows = await db.listItems(list.id);
  return { id: list.id, slug: list.slug, title: list.title, columns: list.columns, rows };
}

export async function saveListForUser(db: DbPort, userId: string, listId: string, input: SaveListInput) {
  const ok = await db.saveList(userId, listId, input.title, input.columns, input.rows);
  if (!ok) throw new AppError(404, "Not found");
}