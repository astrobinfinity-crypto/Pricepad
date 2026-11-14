export type PriceList = {
  id: string;
  ownerId: string;
  slug: string;
  title: string;
  columns: string[];
};

export interface DbPort {
  /** Create the user if new; return their internal id either way. */
  upsertUser(firebaseUid: string, email?: string): Promise<string>;
  createList(ownerId: string, title: string, slug: string, columns: string[]): Promise<PriceList>;
  listListsByOwner(ownerId: string): Promise<PriceList[]>;
}