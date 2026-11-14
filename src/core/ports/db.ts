export type PriceList = {
  id: string;
  ownerId: string;
  slug: string;
  title: string;
  columns: string[];
};

export interface DbPort {
  upsertUser(firebaseUid: string, email?: string): Promise<string>;
  createList(ownerId: string, title: string, slug: string, columns: string[]): Promise<PriceList>;
  listListsByOwner(ownerId: string): Promise<PriceList[]>;
  /** Returns null if the list doesn't exist OR belongs to someone else. */
  getListForOwner(ownerId: string, listId: string): Promise<PriceList | null>;
  listItems(listId: string): Promise<string[][]>;
  /** Replaces title, columns and all rows. Returns false if the list isn't owned by ownerId. */
  saveList(ownerId: string, listId: string, title: string, columns: string[], rows: string[][]): Promise<boolean>;
}