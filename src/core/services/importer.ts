import { z } from "zod";
import type { AIProvider, ColumnMapping } from "../ports/ai";
import type { CachePort } from "../ports/cache";
import type { DbPort } from "../ports/db";
import { AppError } from "../errors";

export const mapInput = z.object({
  headers: z.array(z.string().max(100)).min(1).max(60),
  sampleRows: z.array(z.array(z.string().max(100)).max(60)).max(5),
});
export type MapInput = z.infer<typeof mapInput>;

const AI_CALLS_PER_DAY = 20;

// Names that mean the same thing. Normalized: lowercase, letters and digits only.
const GROUPS = [
  ["item", "product", "name", "particulars", "itemname"],
  ["unit", "uom"],
  ["mrp", "listprice"],
  ["price", "rate", "ourprice", "sellingprice", "saleprice", "dealerrate"],
];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const groupOf = (n: string) => GROUPS.findIndex((g) => g.includes(n));

// Free, instant matching. No AI needed when headers are recognisable.
export function heuristicMapping(targets: string[], headers: string[]): ColumnMapping {
  const used = new Set<number>();
  const normHeaders = headers.map(norm);
  const result: ColumnMapping = targets.map(() => null);

  targets.forEach((t, ti) => {
    const i = normHeaders.findIndex((h, hi) => !used.has(hi) && h !== "" && h === norm(t));
    if (i >= 0) {
      result[ti] = i;
      used.add(i);
    }
  });
  targets.forEach((t, ti) => {
    if (result[ti] !== null) return;
    const g = groupOf(norm(t));
    if (g < 0) return;
    const i = normHeaders.findIndex((h, hi) => !used.has(hi) && groupOf(h) === g);
    if (i >= 0) {
      result[ti] = i;
      used.add(i);
    }
  });
  return result;
}

// Keep the free matches, use AI answers only for gaps, never use one spreadsheet column twice.
function merge(base: ColumnMapping, ai: ColumnMapping): ColumnMapping {
  const used = new Set(base.filter((i): i is number => i !== null));
  return base.map((b, t) => {
    if (b !== null) return b;
    const a = ai[t];
    if (a !== null && !used.has(a)) {
      used.add(a);
      return a;
    }
    return null;
  });
}

// A rough daily cap on AI calls per user. (KV isn't perfectly exact, which is fine for a cost guard.)
async function spendAiCall(cache: CachePort, userId: string) {
  const key = `ai:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const used = Number((await cache.get(key)) ?? "0");
  if (used >= AI_CALLS_PER_DAY) return false;
  await cache.put(key, String(used + 1), 86400);
  return true;
}

type Deps = { db: DbPort; cache: CachePort; ai: AIProvider | null };

export async function suggestMapping(c: Deps, userId: string, listId: string, input: MapInput) {
  const list = await c.db.getListForOwner(userId, listId);
  if (!list) throw new AppError(404, "Not found");

  const base = heuristicMapping(list.columns, input.headers);
  if (base.every((i) => i !== null) || !c.ai) {
    return { mapping: base, usedAI: false, aiLimited: false };
  }
  if (!(await spendAiCall(c.cache, userId))) {
    return { mapping: base, usedAI: false, aiLimited: true };
  }
  try {
    const ai = await c.ai.mapColumns(list.columns, input.headers, input.sampleRows);
    return { mapping: merge(base, ai), usedAI: true, aiLimited: false };
  } catch (e) {
    // If the AI is down or answers badly, the import still works with the free match.
    console.error("AI mapping failed:", e instanceof Error ? e.message : "unknown");
    return { mapping: base, usedAI: false, aiLimited: false };
  }
}