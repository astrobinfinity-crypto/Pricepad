import type { Account, DbPort, PriceList } from "../../core/ports/db";
import { PLANS, TRIAL_DAYS, TRIAL_PLAN, type PlanName } from "../../core/plans";

type ListRow = {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  columns_json: string;
  whatsapp: string | null;
  published_at: number | null;
  pin_hash: string | null;
};

const LIST_COLUMNS = "id, owner_id, slug, title, columns_json, whatsapp, published_at, pin_hash";

const toList = (r: ListRow): PriceList => ({
  id: r.id,
  ownerId: r.owner_id,
  slug: r.slug,
  title: r.title,
  columns: JSON.parse(r.columns_json),
  whatsapp: r.whatsapp,
  publishedAt: r.published_at,
  hasPin: !!r.pin_hash, // only a yes/no leaves this file, never the hash
});

export function d1Db(db: D1Database): DbPort {
  return {
    async upsertUser(firebaseUid, email) {
      // A brand-new user starts with a free trial. An existing user is left untouched.
      await db
        .prepare(
          "INSERT INTO users (id, firebase_uid, email, plan, plan_until) VALUES (?, ?, ?, ?, unixepoch() + ?) ON CONFLICT(firebase_uid) DO NOTHING"
        )
        .bind(crypto.randomUUID(), firebaseUid, email ?? null, TRIAL_PLAN, TRIAL_DAYS * 86400)
        .run();
      const row = await db
        .prepare("SELECT id FROM users WHERE firebase_uid = ?")
        .bind(firebaseUid)
        .first<{ id: string }>();
      return row!.id;
    },

    async getAccount(userId): Promise<Account> {
      const row = await db
        .prepare("SELECT plan, plan_until FROM users WHERE id = ?")
        .bind(userId)
        .first<{ plan: string; plan_until: number | null }>();
      const plan: PlanName = row && row.plan in PLANS ? (row.plan as PlanName) : "free";
      return { plan, planUntil: row?.plan_until ?? null };
    },

    async setPlan(userId, plan, planUntil) {
      await db.prepare("UPDATE users SET plan = ?, plan_until = ? WHERE id = ?").bind(plan, planUntil, userId).run();
    },

    async createList(ownerId, title, slug, columns) {
      const id = crypto.randomUUID();
      await db
        .prepare("INSERT INTO price_lists (id, owner_id, slug, title, columns_json) VALUES (?, ?, ?, ?, ?)")
        .bind(id, ownerId, slug, title, JSON.stringify(columns))
        .run();
      return { id, ownerId, slug, title, columns, whatsapp: null, publishedAt: null, hasPin: false };
    },

    async listListsByOwner(ownerId) {
      const { results } = await db
        .prepare(`SELECT ${LIST_COLUMNS} FROM price_lists WHERE owner_id = ? ORDER BY created_at DESC`)
        .bind(ownerId)
        .all<ListRow>();
      return results.map(toList);
    },

    async getListForOwner(ownerId, listId) {
      const row = await db
        .prepare(`SELECT ${LIST_COLUMNS} FROM price_lists WHERE id = ? AND owner_id = ?`)
        .bind(listId, ownerId)
        .first<ListRow>();
      return row ? toList(row) : null;
    },

    async listItems(listId) {
      const { results } = await db
        .prepare("SELECT data_json FROM items WHERE list_id = ? ORDER BY position")
        .bind(listId)
        .all<{ data_json: string }>();
      return results.map((r) => JSON.parse(r.data_json) as string[]);
    },

    async countItems(listId) {
      const row = await db
        .prepare("SELECT COUNT(*) AS n FROM items WHERE list_id = ?")
        .bind(listId)
        .first<{ n: number }>();
      return row?.n ?? 0;
    },

    async saveList(ownerId, listId, title, columns, rows) {
      const owned = await db
        .prepare("SELECT id FROM price_lists WHERE id = ? AND owner_id = ?")
        .bind(listId, ownerId)
        .first();
      if (!owned) return false;

      const statements = [
        db
          .prepare("UPDATE price_lists SET title = ?, columns_json = ?, version = version + 1, updated_at = unixepoch() WHERE id = ?")
          .bind(title, JSON.stringify(columns), listId),
        db.prepare("DELETE FROM items WHERE list_id = ?").bind(listId),
        ...rows.map((cells, i) =>
          db
            .prepare("INSERT INTO items (id, list_id, position, data_json, search_text) VALUES (?, ?, ?, ?, ?)")
            .bind(crypto.randomUUID(), listId, i, JSON.stringify(cells), cells.join(" ").toLowerCase())
        ),
      ];
      await db.batch(statements); // one all-or-nothing transaction
      return true;
    },

    async setPublication(ownerId, listId, publishedAt, whatsapp) {
      const res = await db
        .prepare("UPDATE price_lists SET published_at = ?, whatsapp = COALESCE(?, whatsapp) WHERE id = ? AND owner_id = ?")
        .bind(publishedAt, whatsapp, listId, ownerId)
        .run();
      return res.meta.changes > 0;
    },

    // One atomic statement: it only counts the publish if today's limit isn't used up yet.
    async claimPublishSlot(ownerId, listId, day, limit) {
      const res = await db
        .prepare(
          `UPDATE price_lists
             SET publish_count = CASE WHEN publish_day = ? THEN publish_count + 1 ELSE 1 END,
                 publish_day = ?
           WHERE id = ? AND owner_id = ?
             AND (publish_day IS NOT ? OR publish_count < ?)`
        )
        .bind(day, day, listId, ownerId, day, limit)
        .run();
      return res.meta.changes > 0;
    },

    async getPinHash(ownerId, listId) {
      const row = await db
        .prepare("SELECT pin_hash FROM price_lists WHERE id = ? AND owner_id = ?")
        .bind(listId, ownerId)
        .first<{ pin_hash: string | null }>();
      return row?.pin_hash ?? null;
    },

    async setPinHash(ownerId, listId, pinHash) {
      const res = await db
        .prepare("UPDATE price_lists SET pin_hash = ? WHERE id = ? AND owner_id = ?")
        .bind(pinHash, listId, ownerId)
        .run();
      return res.meta.changes > 0;
    },
  };
}