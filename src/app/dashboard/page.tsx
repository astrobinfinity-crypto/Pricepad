"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../lib/firebase-client";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("rejected");
        const data = (await res.json()) as { email?: string };
        setEmail(data.email ?? null);
      } catch {
        setError("Could not verify your login.");
      }
    });
    return unsubscribe;
  }, [router]);

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {email && <p className="mt-4">Logged in as {email}</p>}
      <button
        onClick={() => signOut(auth)}
        className="mt-6 rounded-lg border px-4 py-2"
      >
        Sign out
      </button>
    </main>
  );
}