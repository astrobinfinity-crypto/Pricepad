// The ONLY place plan numbers live. Change a number here and it changes everywhere.
export const PLANS = {
  free: { label: "Free", priceInr: 0,   lists: 1,  itemsPerList: 50,   images: 10,   importRows: 50,   aiPerDay: 1,  publishesPerDay: 3,  pin: false, branding: true,  brandKit: false },
  plus: { label: "Plus", priceInr: 799, lists: 3,  itemsPerList: 200,  images: 100,  importRows: 200,  aiPerDay: 5,  publishesPerDay: 10, pin: false, branding: true,  brandKit: false },
  pro:  { label: "Pro",  priceInr: 999, lists: 20, itemsPerList: 5000, images: 3000, importRows: 2000, aiPerDay: 20, publishesPerDay: 50, pin: true,  branding: false, brandKit: true  },
} as const;

export type PlanName = keyof typeof PLANS;

export const TRIAL_DAYS = 14;
export const TRIAL_PLAN: PlanName = "pro";

// A paid or trial plan counts only until its end date. After that the user is on Free.
export function effectivePlan(
  account: { plan: PlanName; planUntil: number | null },
  now = Math.floor(Date.now() / 1000)
): PlanName {
  return account.plan !== "free" && account.planUntil !== null && account.planUntil > now ? account.plan : "free";
}