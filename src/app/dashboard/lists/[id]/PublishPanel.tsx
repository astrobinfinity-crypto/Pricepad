"use client";

import { useState } from "react";
import { apiFetch } from "../../../../lib/api";

type Props = {
  listId: string;
  slug: string;
  initialWhatsapp: string | null;
  initialPublishedAt: number | null;
  unsaved: boolean;
};

export default function PublishPanel({ listId, slug, initialWhatsapp, initialPublishedAt, unsaved }: Props) {
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp ?? "");
  const [published, setPublished] = useState(initialPublishedAt !== null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const link = `${window.location.origin}/p/${slug}`;

  async function call(method: "POST" | "DELETE") {
    const res = await apiFetch(`/api/lists/${listId}/publish`, {
      method,
      body: method === "POST" ? JSON.stringify({ whatsapp }) : undefined,
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Something went wrong");
    }
  }

  async function publish() {
    if (unsaved) {
      setError("Save your changes first, then publish.");
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    try {
      await call("POST");
      setPublished(true);
      setNote("Published. The public page now shows your latest saved prices.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish.");
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await call("DELETE");
      setPublished(false);
      setNote("Unpublished. The public link no longer works.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unpublish.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="mt-4 rounded-lg border p-4">
      <h2 className="font-semibold">Publish</h2>
      <p className="mt-1 text-sm text-gray-600">
        Customers will see this number on the public page and use it to send you inquiries on WhatsApp.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="WhatsApp number, e.g. 98765 43210"
          inputMode="tel"
          maxLength={20}
          className="min-w-[220px] flex-1 rounded-lg border px-3 py-2"
        />
        <button
          onClick={publish}
          disabled={busy || !whatsapp.trim()}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-40"
        >
          {busy ? "Working..." : published ? "Publish again" : "Publish"}
        </button>
        {published && (
          <button onClick={unpublish} disabled={busy} className="rounded-lg border px-4 py-2 disabled:opacity-40">
            Unpublish
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {note && <p className="mt-2 text-sm text-green-700">{note}</p>}

      {published && (
        <div className="mt-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <a href={link} target="_blank" rel="noopener noreferrer" className="break-all underline">
              {link}
            </a>
            <button onClick={copyLink} className="rounded border px-2 py-1">
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="mt-2 text-gray-600">Edits don&apos;t change the public page until you click Publish again.</p>
        </div>
      )}
    </section>
  );
}