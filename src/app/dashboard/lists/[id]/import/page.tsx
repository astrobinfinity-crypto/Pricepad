"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import readXlsxFile from "read-excel-file";
import Papa from "papaparse";
import { auth } from "../../../../../lib/firebase-client";
import { apiFetch } from "../../../../../lib/api";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type ListData = {
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
  limits: { itemsPerList: number; importRows: number };
};
type MapResult = { mapping: (number | null)[]; usedAI: boolean; aiLimited: boolean };

const cellText = (cell: unknown) =>
  cell === null || cell === undefined
    ? ""
    : cell instanceof Date
      ? cell.toISOString().slice(0, 10)
      : String(cell).trim();

async function readSheet(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  let raw: unknown[][];
  if (name.endsWith(".xlsx")) {
    raw = await readXlsxFile(file);
  } else if (name.endsWith(".csv")) {
    raw = Papa.parse<string[]>(await file.text(), { skipEmptyLines: true }).data;
  } else {
    throw new Error("Please choose an .xlsx or .csv file. (For old .xls files, open them in Excel and save as .xlsx.)");
  }
  return raw.map((row) => row.map(cellText));
}

export default function ImportPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [list, setList] = useState<ListData | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<(number | null)[]>([]);
  const [source, setSource] = useState<"auto" | "ai" | "manual">("auto");
  const [aiLimited, setAiLimited] = useState(false);
  const [busy, setBusy] = useState(false);
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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file || !list) return;
    setError("");
    setHeaders([]);
    setData([]);
    setMapping([]);
    if (file.size > MAX_FILE_BYTES) {
      setError("This file is too big (maximum 5 MB).");
      return;
    }
    setBusy(true);
    try {
      const all = await readSheet(file);
      // The header row is the first row with at least two filled cells (skips title rows).
      const headerIdx = all.findIndex((r) => r.filter((c) => c !== "").length >= 2);
      if (headerIdx < 0) throw new Error("Could not find a header row in this file.");
      const hdrs = all[headerIdx].slice(0, 60).map((h) => h.slice(0, 100));
      const rows = all.slice(headerIdx + 1).filter((r) => r.some((c) => c !== ""));
      if (rows.length === 0) throw new Error("No items found below the header row.");
      if (rows.length > list.limits.importRows) {
        throw new Error(
          `This file has ${rows.length} items, but your plan allows importing ${list.limits.importRows} at a time. Split the file, or upgrade for more.`
        );
      }
      if (list.rows.length + rows.length > list.limits.itemsPerList) {
        throw new Error(
          `Your plan allows ${list.limits.itemsPerList} items per list. This import would go over that. Upgrade for more.`
        );
      }

      const res = await apiFetch(`/api/lists/${id}/map-columns`, {
        method: "POST",
        body: JSON.stringify({
          headers: hdrs,
          sampleRows: rows.slice(0, 5).map((r) => r.slice(0, 60).map((c) => c.slice(0, 100))),
        }),
      });
      if (!res.ok) throw new Error("Could not suggest a column match. Please try again.");
      const result = (await res.json()) as MapResult;

      setHeaders(hdrs);
      setData(rows);
      setMapping(result.mapping);
      setSource(result.usedAI ? "ai" : "auto");
      setAiLimited(result.aiLimited);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this file.");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  function setTarget(t: number, value: string) {
    setMapping(mapping.map((m, i) => (i === t ? (value === "" ? null : Number(value)) : m)));
    setSource("manual");
  }

  async function runImport() {
    if (!list) return;
    setBusy(true);
    setError("");
    try {
      const imported = data
        .map((r) => mapping.map((i) => (i === null ? "" : (r[i] ?? "").slice(0, 200))))
        .filter((r) => r.some((c) => c !== ""));
      const res = await apiFetch(`/api/lists/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title: list.title, columns: list.columns, rows: [...list.rows, ...imported] }),
      });
      if (!res.ok) throw new Error("save failed");
      router.push(`/dashboard/lists/${id}`);
    } catch {
      setError("Could not import. Nothing was changed. Please try again.");
      setBusy(false);
    }
  }

  if (error && !list) return <main className="p-6 text-red-600">{error}</main>;
  if (!list) return <main className="p-6">Loading...</main>;

  const previewRows = data.slice(0, 5).map((r) => mapping.map((i) => (i === null ? "" : (r[i] ?? ""))));

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link href={`/dashboard/lists/${id}`} className="text-sm text-gray-600 underline">
        Back to editor
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Import into &quot;{list.title}&quot;</h1>
      <p className="mt-1 text-sm text-gray-600">
        Upload an Excel (.xlsx) or CSV file. Items are added below your existing {list.rows.length} items. After
        importing, click Publish again to update the public page.
      </p>

      <input
        type="file"
        accept=".xlsx,.csv"
        onChange={onFile}
        disabled={busy}
        className="mt-4 block w-full rounded-lg border p-3"
      />

      {busy && <p className="mt-3 text-gray-600">Working...</p>}
            {error && (
        <p className="mt-3 text-red-600">
          {error}{" "}
          <Link href="/pricing" className="underline">
            See plans
          </Link>
        </p>
      )}

      {headers.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold">Check the column match</h2>
          <p className="text-sm text-gray-600">
            {source === "auto" &&
              (mapping.some((m) => m !== null)
                ? "Matched automatically."
                : "Could not match the columns automatically. Please choose them below.")}
            {source === "ai" && "Suggested by AI. Please check each one."}
            {source === "manual" && "You changed the match."}
            {aiLimited && " The daily AI limit was reached, so please check the match yourself."}
          </p>

          <div className="mt-3 space-y-2">
            {list.columns.map((col, t) => (
              <div key={t} className="flex items-center gap-3">
                <span className="w-40 shrink-0 font-medium">{col}</span>
                <span className="text-gray-400">=</span>
                <select
                  value={mapping[t] ?? ""}
                  onChange={(e) => setTarget(t, e.target.value)}
                  className="flex-1 rounded-lg border px-2 py-2"
                >
                  <option value="">(leave empty)</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <h2 className="mt-6 font-semibold">Preview (first {previewRows.length} of {data.length} items)</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-sm">
              <thead>
                <tr>
                  {list.columns.map((c, i) => (
                    <th key={i} className="border bg-gray-50 px-2 py-1 text-left">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} className="border px-2 py-1">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={runImport}
            disabled={busy || mapping.every((m) => m === null)}
            className="mt-5 rounded-lg bg-black px-5 py-3 text-white disabled:opacity-40"
          >
            Import {data.length} items
          </button>
        </section>
      )}
    </main>
  );
}