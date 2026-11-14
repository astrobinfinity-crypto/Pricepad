import type { DbPort, PriceList } from "../../core/ports/db";

type ListRow = { id: string; owner_id: string; slug: string; title: string; columns_json: string };

const toList = (r: ListRow): PriceList => ({
  id: r.id,
  ownerId: r.owner_id,
  slug: r.slug,
  title: r.title,
  columns: JSON.parse(r.columns_json),
});

const BATCH_SIZE = 90; // we send statements to D1 in chunks

export function d1Db(db: D1Database): DbPort {
  return {
    async upsertUser(firebaseUid, email) {
      await db
        .prepare("INSERT INTO users (id, firebase_uid, email) VALUES (?, ?, ?) ON CONFLICT(firebase_uid) DO NOTHING")
        .bind(crypto.randomUUID(), firebaseUid, email ?? null)
        .run();
      const row = await db
        .prepare("SELECT id FROM users WHERE firebase_uid = ?")
        .bind(firebaseUid)
        .first<{ id: string }>();
      return row!.id;
    },

    async createList(ownerId, title, slug, columns) {
      const id = crypto.randomUUID();
      await db
        .prepare("INSERT INTO price_lists (id, owner_id, slug, title, columns_json) VALUES (?, ?, ?, ?, ?)")
        .bind(id, ownerId, slug, title, JSON.stringify(columns))
        .run();
      return { id, ownerId, slug, title, columns };
    },

    async listListsByOwner(ownerId) {
      const { results } = await db
        .prepare("SELECT id, owner_id, slug, title, columns_json FROM price_lists WHERE owner_id = ? ORDER BY created_at DESC")
        .bind(ownerId)
        .all<ListRow>();
      return results.map(toList);
    },

    async getListForOwner(ownerId, listId) {
      const row = await db
        .prepare("SELECT id, owner_id, slug, title, columns_json FROM price_lists WHERE id = ? AND owner_id = ?")
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

    async saveList(ownerId, listId, title, columns, rows) {
      // Ownership check first: a list that isn't yours looks like it doesn't exist.
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
      for (let i = 0; i < statements.length; i += BATCH_SIZE) {
        await db.batch(statements.slice(i, i + BATCH_SIZE));
      }
      return true;
    },
  };
}