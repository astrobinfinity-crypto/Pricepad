import Link from "next/link";
import { PLANS, TRIAL_DAYS, type PlanName } from "../../core/plans";

const NAMES: PlanName[] = ["free", "plus", "pro"];

const ROWS: { label: string; value: (p: (typeof PLANS)[PlanName]) => string }[] = [
  { label: "Price lists", value: (p) => String(p.lists) },
  { label: "Items per list", value: (p) => p.itemsPerList.toLocaleString("en-IN") },
  { label: "Item images", value: (p) => p.images.toLocaleString("en-IN") },
  { label: "Publish, QR, search, WhatsApp cart", value: () => "Yes" },
  { label: "Bulk import", value: (p) => `Up to ${p.importRows.toLocaleString("en-IN")} rows` },
  { label: "AI column matching", value: (p) => `${p.aiPerDay}/day` },
  { label: "Publishes per list per day", value: (p) => String(p.publishesPerDay) },
  { label: "PricePad link on public page", value: (p) => (p.branding ? "Shown" : "Removed") },
  { label: "PIN-protected wholesale lists", value: (p) => (p.pin ? "Yes" : "No") },
  { label: "Logo and brand color", value: (p) => (p.brandKit ? "Yes" : "No") },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold">Plans</h1>
      <p className="mt-2 text-gray-600">
        Every new account starts with a {TRIAL_DAYS}-day Pro trial. No card needed.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className="border-b p-3 text-left" />
              {NAMES.map((n) => (
                <th key={n} className={`border-b p-3 text-left ${n === "pro" ? "bg-gray-50" : ""}`}>
                  <div className="text-lg font-bold">{PLANS[n].label}</div>
                  <div className="font-normal">
                    {PLANS[n].priceInr === 0 ? "Free" : `₹${PLANS[n].priceInr}/year`}
                  </div>
                  {PLANS[n].priceInr > 0 && (
                    <div className="text-sm font-normal text-gray-500">
                      about ₹{Math.round(PLANS[n].priceInr / 12)} a month
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <td className="border-b p-3 font-medium">{row.label}</td>
                {NAMES.map((n) => (
                  <td key={n} className={`border-b p-3 ${n === "pro" ? "bg-gray-50 font-semibold" : ""}`}>
                    {row.value(PLANS[n])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/login" className="rounded-lg bg-black px-5 py-3 text-white">
          Start free
        </Link>
        <span className="self-center text-sm text-gray-500">Paid plans can be bought from your dashboard soon.</span>
      </div>
    </main>
  );
}