"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../lib/firebase-client";
import { apiFetch } from "../../lib/api";

type PriceList = { id: string; slug: string; title: string; columns: string[] };

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [lists, setLists] = useState<PriceList[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadLists = useCallback(async () => {
    const res = await apiFetch("/api/lists");
    if (!res.ok) throw new Error("load failed");
    setLists((await res.json()) as PriceList[]);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setEmail(user.email);
      try {
        await loadLists();
        setReady(true);
      } catch {
        setError("Could not load your lists.");
      }
    });
  }, [router, loadLists]);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch("/api/lists", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "failed");
      }
      setTitle("");
      await loadLists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the list.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My price lists</h1>
        <button onClick={() => signOut(auth)} className="rounded-lg border px-3 py-1 text-sm">
          Sign out
        </button>
      </div>
      {email && <p className="mt-1 text-sm text-gray-600">{email}</p>}

      <form onSubmit={createList} className="mt-6 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sri Sai Hardware"
          maxLength={100}
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button disabled={busy} className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50">
          {busy ? "Creating..." : "Create"}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      {ready && lists.length === 0 && (
        <p className="mt-6 text-gray-600">No lists yet. Create your first one above.</p>
      )}

      <ul className="mt-6 space-y-2">
        {lists.map((l) => (
          <li key={l.id}>
            <Link href={`/dashboard/lists/${l.id}`} className="block rounded-lg border p-4 hover:bg-gray-50">
              <div className="font-semibold">{l.title}</div>
              <div className="text-sm text-gray-600">{l.columns.join(" | ")}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}