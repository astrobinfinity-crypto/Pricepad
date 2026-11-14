import type { DbPort, PriceList } from "../../core/ports/db";

type ListRow = { id: string; owner_id: string; slug: string; title: string; columns_json: string };

const toList = (r: ListRow): PriceList => ({
  id: r.id,
  ownerId: r.owner_id,
  slug: r.slug,
  title: r.title,
  columns: JSON.parse(r.columns_json),
});

export function d1Db(db: D1Database): DbPort {
  return {
    async upsertUser(firebaseUid, email) {
      // ? placeholders keep user input separate from SQL (prevents SQL injection)
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
  };
}