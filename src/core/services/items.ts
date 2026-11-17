import { z } from "zod";
import type { DbPort } from "../ports/db";
import { AppError } from "../errors";
import { getPlanFor, limitError } from "../policy";

export const saveListInput = z
  .object({
    title: z.string().trim().min(1).max(100),
    columns: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
    rows: z.array(z.array(z.string().trim().max(200))).max(5000), // absolute ceiling for every plan
  })
  .refine((d) => d.rows.every((r) => r.length === d.columns.length), {
    message: "Every row must have one value per column",
  });

export type SaveListInput = z.infer<typeof saveListInput>;

export async function getListWithItems(db: DbPort, userId: string, listId: string) {
  const list = await db.getListForOwner(userId, listId);
  if (!list) throw new AppError(404, "Not found");
  const [rows, plan] = await Promise.all([db.listItems(list.id), getPlanFor(db, userId)]);
  return {
    id: list.id,
    slug: list.slug,
    title: list.title,
    columns: list.columns,
    rows,
    whatsapp: list.whatsapp,
    publishedAt: list.publishedAt,
    hasPin: list.hasPin,
    plan: plan.name,
    limits: {
      itemsPerList: plan.limits.itemsPerList,
      importRows: plan.limits.importRows,
      pin: plan.limits.pin,
    },
  };
}

export async function saveListForUser(db: DbPort, userId: string, listId: string, input: SaveListInput) {
  // Check ownership first, so we never reveal anything about someone else's list.
  const list = await db.getListForOwner(userId, listId);
  if (!list) throw new AppError(404, "Not found");

  const plan = await getPlanFor(db, userId);
  const existing = await db.countItems(listId);
  // Over the limit (for example after a trial ends)? The owner can still edit and delete, just not add.
  const cap = Math.max(plan.limits.itemsPerList, existing);
  if (input.rows.length > cap) {
    throw limitError(
      `The ${plan.limits.label} plan allows ${plan.limits.itemsPerList} items per list. See Plans to upgrade.`
    );
  }

  const ok = await db.saveList(userId, listId, input.title, input.columns, input.rows);
  if (!ok) throw new AppError(404, "Not found");
}