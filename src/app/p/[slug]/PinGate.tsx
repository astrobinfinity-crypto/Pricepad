"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PinGate({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/p/${slug}/unlock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong");
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-gray-600">This price list is private. Enter the PIN you were given.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          autoComplete="off"
          maxLength={12}
          placeholder="PIN"
          className="w-full rounded-lg border px-3 py-3 text-center text-xl tracking-widest"
        />
        <button disabled={busy || pin.length < 6} className="w-full rounded-lg bg-black px-4 py-3 text-white disabled:opacity-40">
          {busy ? "Checking..." : "View prices"}
        </button>
        {error && <p className="text-center text-red-600">{error}</p>}
      </form>
    </main>
  );
}