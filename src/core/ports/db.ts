export type PriceList = {
  id: string;
  ownerId: string;
  slug: string;
  title: string;
  columns: string[];
  whatsapp: string | null;
  publishedAt: number | null;
};

export interface DbPort {
  upsertUser(firebaseUid: string, email?: string): Promise<string>;
  createList(ownerId: string, title: string, slug: string, columns: string[]): Promise<PriceList>;
  listListsByOwner(ownerId: string): Promise<PriceList[]>;
  /** Returns null if the list doesn't exist OR belongs to someone else. */
  getListForOwner(ownerId: string, listId: string): Promise<PriceList | null>;
  listItems(listId: string): Promise<string[][]>;
  saveList(ownerId: string, listId: string, title: string, columns: string[], rows: string[][]): Promise<boolean>;
  /** publishedAt = null means unpublished. whatsapp = null keeps the stored number. */
  setPublication(ownerId: string, listId: string, publishedAt: number | null, whatsapp: string | null): Promise<boolean>;
}