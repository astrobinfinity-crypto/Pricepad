import type { PlanName } from "../plans";

export type PriceList = {
  id: string;
  ownerId: string;
  slug: string;
  title: string;
  columns: string[];
  whatsapp: string | null;
  publishedAt: number | null;
  hasPin: boolean; // the PIN hash itself is never sent to the browser
};

export type Account = { plan: PlanName; planUntil: number | null };

export interface DbPort {
  /** Creates the user on first sight (with the free trial) and returns their id. */
  upsertUser(firebaseUid: string, email?: string): Promise<string>;
  getAccount(userId: string): Promise<Account>;
  /** Used by payments (step 9C). */
  setPlan(userId: string, plan: PlanName, planUntil: number): Promise<void>;

  createList(ownerId: string, title: string, slug: string, columns: string[]): Promise<PriceList>;
  listListsByOwner(ownerId: string): Promise<PriceList[]>;
  /** Returns null if the list doesn't exist OR belongs to someone else. */
  getListForOwner(ownerId: string, listId: string): Promise<PriceList | null>;
  listItems(listId: string): Promise<string[][]>;
  countItems(listId: string): Promise<number>;
  saveList(ownerId: string, listId: string, title: string, columns: string[], rows: string[][]): Promise<boolean>;

  setPublication(ownerId: string, listId: string, publishedAt: number | null, whatsapp: string | null): Promise<boolean>;
  /** Counts one publish for today. Returns false if today's limit is already used up. */
  claimPublishSlot(ownerId: string, listId: string, day: string, limit: number): Promise<boolean>;

  getPinHash(ownerId: string, listId: string): Promise<string | null>;
  setPinHash(ownerId: string, listId: string, pinHash: string | null): Promise<boolean>;
}