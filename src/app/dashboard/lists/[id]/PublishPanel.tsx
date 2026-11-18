"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../../../lib/api";

type Props = {
  listId: string;
  slug: string;
  initialWhatsapp: string | null;
  initialPublishedAt: number | null;
  initialHasPin: boolean;
  canPin: boolean;
  unsaved: boolean;
};

async function messageOf(res: Response) {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? "Something went wrong";
}

export default function PublishPanel({
  listId,
  slug,
  initialWhatsapp,
  initialPublishedAt,
  initialHasPin,
  canPin,
  unsaved,
}: Props) {
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp ?? "");
  const [published, setPublished] = useState(initialPublishedAt !== null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const [hasPin, setHasPin] = useState(initialHasPin);
  const [pin, setPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinNote, setPinNote] = useState("");

  const link = `${window.location.origin}/p/${slug}`;

  async function publish() {
    if (unsaved) {
      setError("Save your changes first, then publish.");
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await apiFetch(`/api/lists/${listId}/publish`, { method: "POST", body: JSON.stringify({ whatsapp }) });
      if (!res.ok) throw new Error(await messageOf(res));
      setPublished(true);
      setNote(
        hasPin
          ? "Published. Visitors must enter the PIN to see the prices."
          : "Published. The public page now shows your latest saved prices."
      );
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
      const res = await apiFetch(`/api/lists/${listId}/publish`, { method: "DELETE" });
      if (!res.ok) throw new Error(await messageOf(res));
      setPublished(false);
      setNote("Unpublished. The public link no longer works.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unpublish.");
    } finally {
      setBusy(false);
    }
  }

  async function savePin() {
    setPinError("");
    setPinNote("");
    if (!/^\d{6,12}$/.test(pin)) {
      setPinError("The PIN must be 6 to 12 digits.");
      return;
    }
    setPinBusy(true);
    try {
      const res = await apiFetch(`/api/lists/${listId}/pin`, { method: "PUT", body: JSON.stringify({ pin }) });
      if (!res.ok) throw new Error(await messageOf(res));
      setHasPin(true);
      setPin("");
      setPinNote(
        published
          ? "PIN saved. The public page is now locked. Share the PIN separately, never inside the link."
          : "PIN saved. It takes effect when you publish."
      );
    } catch (e) {
      setPinError(e instanceof Error ? e.message : "Could not save the PIN.");
    } finally {
      setPinBusy(false);
    }
  }

  async function removePin() {
    setPinBusy(true);
    setPinError("");
    setPinNote("");
    try {
      const res = await apiFetch(`/api/lists/${listId}/pin`, { method: "DELETE" });
      if (!res.ok) throw new Error(await messageOf(res));
      setHasPin(false);
      setPinNote(published ? "PIN removed. Anyone with the link can now see the prices." : "PIN removed.");
    } catch (e) {
      setPinError(e instanceof Error ? e.message : "Could not remove the PIN.");
    } finally {
      setPinBusy(false);
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

      <Link
        href={`/dashboard/lists/${listId}/print`}
        className="mt-3 inline-block rounded-lg border px-3 py-2 text-sm"
      >
        Print QR card and rate card
      </Link>

      <div className="mt-4 border-t pt-4">
        <h3 className="font-medium">
          PIN protection for wholesale rates {hasPin && <span className="text-sm text-green-700">(on)</span>}
        </h3>

        {canPin ? (
          <>
            <p className="mt-1 text-sm text-gray-600">
              Only people with the PIN can see this list. Use 6 to 12 digits (8 or more is safer) and share it with
              your dealers directly, for example on WhatsApp.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                autoComplete="off"
                maxLength={12}
                placeholder={hasPin ? "New PIN" : "Choose a PIN"}
                className="w-48 rounded-lg border px-3 py-2"
              />
              <button onClick={savePin} disabled={pinBusy || !pin} className="rounded-lg border px-4 py-2 disabled:opacity-40">
                {hasPin ? "Change PIN" : "Set PIN"}
              </button>
              {hasPin && (
                <button onClick={removePin} disabled={pinBusy} className="rounded-lg border px-4 py-2 disabled:opacity-40">
                  Remove PIN
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-600">
              PIN-protected lists are part of the Pro plan.{" "}
              <Link href="/pricing" className="underline">
                See plans
              </Link>
            </p>
            {hasPin && (
              <button onClick={removePin} disabled={pinBusy} className="mt-2 rounded-lg border px-4 py-2 disabled:opacity-40">
                Remove PIN
              </button>
            )}
          </>
        )}

        {pinError && <p className="mt-2 text-sm text-red-600">{pinError}</p>}
        {pinNote && <p className="mt-2 text-sm text-green-700">{pinNote}</p>}
      </div>
    </section>
  );
}