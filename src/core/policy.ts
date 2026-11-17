import { PLANS, effectivePlan } from "./plans";
import type { DbPort } from "./ports/db";
import { AppError } from "./errors";

// Every route and service asks this one function "what is this user allowed to do?"
export async function getPlanFor(db: DbPort, userId: string) {
  const account = await db.getAccount(userId);
  const name = effectivePlan(account);
  return { name, limits: PLANS[name], until: account.planUntil };
}

// Throw this when a plan limit is hit. Screens can offer an upgrade link when code is PLAN_LIMIT.
export const limitError = (message: string) => new AppError(403, message, "PLAN_LIMIT");