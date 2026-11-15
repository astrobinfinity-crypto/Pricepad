"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import QRCode from "qrcode";
import { auth } from "../../../../../lib/firebase-client";
import { apiFetch } from "../../../../../lib/api";

type ListData = {
  id: string;
  slug: string;
  title: string;
  columns: string[];
  rows: string[][];
  whatsapp: string | null;
  publishedAt: number | null;
};

export default function PrintPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [list, setList] = useState<ListData | null>(null);
  const [mode, setMode] = useState<"card" | "rates">("card");
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const res = await apiFetch(`/api/lists/${id}`);
        if (!res.ok) throw new Error("load failed");
        setList((await res.json()) as ListData);
      } catch {
        setError("Could not load this list.");
      }
    });
  }, [id, router]);

  const publicUrl = list ? `${window.location.origin}/p/${list.slug}` : "";

  useEffect(() => {
    if (!list || !list.publishedAt) return;
    QRCode.toDataURL(publicUrl, { width: 800, margin: 1, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setError("Could not create the QR code."));
  }, [list, publicUrl]);

  if (error) return <main className="p-6 text-red-600">{error}</main>;
  if (!list) return <main className="p-6">Loading...</main>;

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <style>{`@page { margin: 12mm; }`}</style>

      {/* Controls: hidden when printing */}
      <div className="print:hidden">
        <Link href={`/dashboard/lists/${id}`} className="text-sm text-gray-600 underline">
          Back to editor
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode("card")}
            className={`rounded-lg border px-4 py-2 ${mode === "card" ? "bg-black text-white" : ""}`}
          >
            Counter QR card
          </button>
          <button
            onClick={() => setMode("rates")}
            className={`rounded-lg border px-4 py-2 ${mode === "rates" ? "bg-black text-white" : ""}`}
          >
            Rate card (PDF)
          </button>
          <button onClick={() => window.print()} className="ml-auto rounded-lg bg-green-600 px-4 py-2 text-white">
            Print / Save as PDF
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          To get a PDF file for WhatsApp, click Print and choose &quot;Save as PDF&quot; as the printer.
        </p>
        <hr className="my-4" />
      </div>

      {mode === "card" && (
        <section className="flex flex-col items-center text-center">
          {list.publishedAt ? (
            <>
              <h1 className="text-4xl font-bold">{list.title}</h1>
              <p className="mt-3 text-2xl">Scan to see today&apos;s prices</p>
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code for the price list" className="mt-6 h-96 w-96" />
              )}
              <p className="mt-2 text-gray-600">No app needed. Just scan with your phone camera.</p>
              <p className="mt-4 break-all text-sm text-gray-500">{publicUrl}</p>
              <p className="mt-8 text-xs text-gray-400">Powered by PricePad</p>
            </>
          ) : (
            <p className="text-gray-600 print:hidden">
              This list isn&apos;t published yet. Go back to the editor and click Publish first, then your QR code
              will appear here.
            </p>
          )}
        </section>
      )}

      {mode === "rates" && (
        <section>
          <h1 className="text-3xl font-bold">{list.title}</h1>
          <p className="mt-1 text-gray-600">Rate card as of {today}</p>

          {list.rows.length === 0 ? (
            <p className="mt-4 text-gray-600">This list has no items yet.</p>
          ) : (
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr>
                  {list.columns.map((name, c) => (
                    <th key={c} className="border bg-gray-100 px-2 py-2 text-left">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.rows.map((row, r) => (
                  <tr key={r} className="break-inside-avoid">
                    {row.map((cell, c) => (
                      <td key={c} className="border px-2 py-1">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {list.publishedAt && <p className="mt-4 text-xs text-gray-500">Live prices: {publicUrl}</p>}
          <p className="mt-2 text-xs text-gray-400">Prices may change. Created with PricePad.</p>
        </section>
      )}
    </main>
  );
}