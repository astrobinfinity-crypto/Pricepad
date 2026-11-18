"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../../../lib/firebase-client";
import { apiFetch } from "../../../../lib/api";
import PublishPanel from "./PublishPanel";


type ListData = {
  id: string;
  slug: string;
  title: string;
  columns: string[];
  rows: string[][];
  whatsapp: string | null;
  publishedAt: number | null;
  hasPin: boolean;
limits: { itemsPerList: number; importRows: number; pin: boolean };
};

export default function ListEditorPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [maxItems, setMaxItems] = useState(5000);
  const [pub, setPub] = useState<{
    slug: string;
    whatsapp: string | null;
    publishedAt: number | null;
    hasPin: boolean;
    canPin: boolean;
  } | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const res = await apiFetch(`/api/lists/${id}`);
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as ListData;
        setTitle(data.title);
        setColumns(data.columns);
        setRows(data.rows);
        setMaxItems(data.limits.itemsPerList);
        setPub({
          slug: data.slug,
          whatsapp: data.whatsapp,
          publishedAt: data.publishedAt,
          hasPin: data.hasPin,
          canPin: data.limits.pin,
        });
        setLoading(false);
      } catch {
        setError("Could not load this list.");
        setLoading(false);
      }
    });
  }, [id, router]);

  // Warn before leaving the page with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function edit<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setDirty(true);
    setMessage("");
  }

  const setCell = (r: number, c: number, value: string) =>
    edit(setRows, rows.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? value : cell)) : row)));
  const setColumnName = (c: number, value: string) =>
    edit(setColumns, columns.map((name, j) => (j === c ? value : name)));
 const addRow = () => {
  if (rows.length >= maxItems) {
    setError(`Your plan allows ${maxItems} items per list. Open Plans from the dashboard to upgrade.`);
    return;
  }
  edit(setRows, [...rows, columns.map(() => "")]);
};
  const deleteRow = (r: number) => edit(setRows, rows.filter((_, i) => i !== r));

  function addColumn() {
    if (columns.length >= 8) return;
    setColumns([...columns, `Column ${columns.length + 1}`]);
    setRows(rows.map((row) => [...row, ""]));
    setDirty(true);
    setMessage("");
  }

  function deleteColumn(c: number) {
    if (columns.length <= 1) return;
    if (!window.confirm(`Delete the column "${columns[c]}" and all its values?`)) return;
    setColumns(columns.filter((_, j) => j !== c));
    setRows(rows.map((row) => row.filter((_, j) => j !== c)));
    setDirty(true);
    setMessage("");
  }

    async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch(`/api/lists/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, columns, rows }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        throw new Error(d.code === "PLAN_LIMIT" && d.error ? d.error : "save failed");
      }
      setDirty(false);
      setMessage("Saved");
    } catch (e) {
      setError(
        e instanceof Error && e.message !== "save failed"
          ? e.message
          : "Could not save. Check that no column name is empty, then try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="p-6">Loading...</main>;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link href="/dashboard" className="text-sm text-gray-600 underline">
        Back to my lists
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => edit(setTitle, e.target.value)}
          maxLength={100}
          className="flex-1 rounded-lg border px-3 py-2 text-xl font-bold"
        />
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <p className="mt-2 h-5 text-sm">
        {error && <span className="text-red-600">{error}</span>}
        {!error && message && <span className="text-green-700">{message}</span>}
        {!error && !message && dirty && <span className="text-gray-600">Unsaved changes</span>}
      </p>
            {pub && (
        <PublishPanel
          listId={id}
          slug={pub.slug}
          initialWhatsapp={pub.whatsapp}
          initialPublishedAt={pub.publishedAt}
          unsaved={dirty}
          initialHasPin={pub.hasPin}
          canPin={pub.canPin}
        />
      )}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              {columns.map((name, c) => (
                <th key={c} className="border bg-gray-50 p-1">
                  <div className="flex items-center gap-1">
                    <input
                      value={name}
                      onChange={(e) => setColumnName(c, e.target.value)}
                      maxLength={40}
                      className="w-full bg-transparent px-1 py-1 font-semibold"
                    />
                    <button
                      onClick={() => deleteColumn(c)}
                      title="Delete column"
                      className="px-1 text-gray-400 hover:text-red-600"
                    >
                      x
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-10 border bg-gray-50" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="border p-0">
                    <input
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      maxLength={200}
                      className="w-full px-2 py-2"
                    />
                  </td>
                ))}
                <td className="border text-center">
                  <button
                    onClick={() => deleteRow(r)}
                    title="Delete row"
                    className="px-2 text-gray-400 hover:text-red-600"
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="mt-3 text-gray-600">No items yet. Click "Add row" to start.</p>}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={addRow} className="rounded-lg border px-4 py-2">
          Add row
        </button>
        <button
          onClick={addColumn}
          disabled={columns.length >= 8}
          className="rounded-lg border px-4 py-2 disabled:opacity-40"
        >
          Add column
        </button>
        <Link
          href={`/dashboard/lists/${id}/import`}
          onClick={(e) => {
            if (dirty) {
              e.preventDefault();
              setError("Save your changes before importing.");
            }
          }}
          className="rounded-lg border px-4 py-2"
        >
          Import from Excel / CSV
        </Link>
      </div>
    </main>
  );
}