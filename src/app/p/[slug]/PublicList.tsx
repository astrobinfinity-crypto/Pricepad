"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PublishedList } from "../../../core/services/publish";
import { inferRoles } from "../../../core/roles";

const MAX_SHOWN = 200; // keeps big lists fast; searching narrows it down

export default function PublicList({ list }: { list: PublishedList }) {
  const { name, price, mrp } = inferRoles(list.columns);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});

  const searchable = useMemo(() => list.rows.map((r) => r.join(" ").toLowerCase()), [list.rows]);

  const matches = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const found: number[] = [];
    for (let i = 0; i < list.rows.length; i++) {
      if (words.every((w) => searchable[i].includes(w))) found.push(i);
    }
    return found;
  }, [query, searchable, list.rows.length]);

  const shown = matches.slice(0, MAX_SHOWN);
  const cartLines = Object.entries(cart).filter(([, qty]) => qty > 0);
  const cartCount = cartLines.reduce((sum, [, qty]) => sum + qty, 0);

  function change(i: number, delta: number) {
    setCart((prev) => {
      const next = Math.max(0, Math.min(999, (prev[i] ?? 0) + delta));
      return { ...prev, [i]: next };
    });
  }

  function whatsappLink() {
    const lines = cartLines.map(([i, qty]) => {
      const row = list.rows[Number(i)];
      const p = price >= 0 && row[price] ? ` (${row[price]})` : "";
      return `${qty} x ${row[name]}${p}`;
    });
    const text = `Hi, I need:\n${lines.join("\n")}\nAre these in stock?`;
    return `https://wa.me/${list.whatsapp}?text=${encodeURIComponent(text)}`;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-4">
      <h1 className="text-2xl font-bold">{list.title}</h1>
      <p className="text-sm text-gray-600">
        Prices updated {new Date(list.publishedAt * 1000).toISOString().slice(0, 10)}
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items, e.g. 1 inch pvc"
        className="sticky top-0 mt-4 w-full rounded-lg border bg-white px-3 py-3 shadow-sm"
      />

      <p className="mt-3 text-sm text-gray-600">
        {matches.length} item{matches.length === 1 ? "" : "s"}
        {matches.length > MAX_SHOWN && ` (showing the first ${MAX_SHOWN}, type to narrow down)`}
      </p>

      <ul className="mt-2 divide-y">
        {shown.map((i) => {
          const row = list.rows[i];
          const qty = cart[i] ?? 0;
          const extra = row.filter((cell, c) => cell && c !== name && c !== price && c !== mrp).join(" · ");
          const showMrp = mrp >= 0 && row[mrp] && row[mrp] !== row[price];
          return (
            <li key={i} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="font-medium">{row[name]}</div>
                {extra && <div className="text-sm text-gray-600">{extra}</div>}
                <div className="mt-1 flex items-baseline gap-2">
                  {price >= 0 && <span className="font-semibold">{row[price]}</span>}
                  {showMrp && <span className="text-sm text-gray-500 line-through">{row[mrp]}</span>}
                </div>
              </div>

              {qty === 0 ? (
                <button
                  onClick={() => change(i, 1)}
                  aria-label={`Add ${row[name]}`}
                  className="h-9 w-9 shrink-0 rounded-full border text-xl leading-none"
                >
                  +
                </button>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => change(i, -1)} aria-label="Remove one" className="h-9 w-9 rounded-full border text-xl leading-none">
                    -
                  </button>
                  <span className="w-6 text-center">{qty}</span>
                  <button onClick={() => change(i, 1)} aria-label="Add one" className="h-9 w-9 rounded-full border text-xl leading-none">
                    +
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {matches.length === 0 && <p className="mt-6 text-gray-600">No items match your search.</p>}

        {list.showBranding !== false && (
        <p className="mt-10 text-center text-sm text-gray-500">
          <Link href="/login" className="underline">
            Create your free price list in 60s with PricePad
          </Link>
        </p>
      )}

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-white p-3">
          <div className="mx-auto max-w-2xl">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg bg-green-600 px-4 py-3 text-center font-semibold text-white"
            >
              Send inquiry on WhatsApp ({cartCount} item{cartCount === 1 ? "" : "s"})
            </a>
          </div>
        </div>
      )}
    </main>
  );
}