"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../lib/firebase-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function signIn() {
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push("/dashboard");
        } catch (e) {
      const code = (e as { code?: string }).code ?? "unknown";
      console.error("Sign-in error:", e);
      setError(`Sign-in failed (${code}). Please try again.`);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">PricePad</h1>
      <p className="text-gray-600">Create your free price list in 60 seconds</p>
      <button onClick={signIn} className="rounded-lg bg-black px-6 py-3 text-white">
        Continue with Google
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}