"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FIELDS,
  MAX_IMPORT_ROWS,
  STATUSES,
  parseImportRow,
  readImportFile,
  type ColumnMap,
  type FieldKey,
} from "@/lib/item-transfer";
import { formatCurrency } from "@/lib/format";
import { copyCapturedImage } from "../items/fetch-link-details";
import { importItemsAction } from "./actions";

type TypeOption = { id: string; name: string; category: string };

const selectClass = "bg-background h-8 w-full rounded-md border px-2 text-sm";

// CSV import (KAM-87): pick a file, check the column mapping and preview,
// then add. Photos are copied into Cubby's storage first.
export function ImportItems({ types }: { types: TypeOption[] }) {
  const [file, setFile] = useState<ReturnType<typeof readImportFile> | null>(
    null,
  );
  const [map, setMap] = useState<ColumnMap>({});
  const [fallbackTypeId, setFallbackTypeId] = useState(
    types.find((t) => t.name === "Misc")?.id ?? types[0]?.id ?? "",
  );
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const typeNames = useMemo(
    () => new Set(types.map((t) => t.name.toLowerCase())),
    [types],
  );
  const parsed = useMemo(
    () => (file ? file.rows.map((row) => parseImportRow(row, map)) : []),
    [file, map],
  );
  const valid = parsed.flatMap((p) => (p.ok ? [p.value] : []));
  const errors = parsed.flatMap((p, i) =>
    p.ok ? [] : [`Row ${i + 2}: ${p.error}`],
  );
  const unmatchedTypes = [
    ...new Set(
      valid
        .map((r) => r.itemType)
        .filter((t): t is string => !!t && !typeNames.has(t.toLowerCase())),
    ),
  ];
  const tooMany = (file?.rows.length ?? 0) > MAX_IMPORT_ROWS;

  async function onFile(f: File | undefined) {
    setResult(null);
    if (!f) return setFile(null);
    const read = readImportFile(await f.text());
    setFile(read);
    setMap(read.map);
  }

  function runImport() {
    if (!file) return;
    startTransition(async () => {
      // Copy photos into Cubby's storage, a few at a time.
      const images: Record<number, string> = {};
      const jobs = parsed.flatMap((p, i) =>
        p.ok && p.value.image
          ? [{ i, link: p.value.link, image: p.value.image }]
          : [],
      );
      const total = jobs.length;
      let done = 0;
      const worker = async () => {
        for (let job = jobs.shift(); job; job = jobs.shift()) {
          setProgress(`Copying photos… ${++done} of ${total}`);
          const copy = await copyCapturedImage(
            job.link ?? job.image,
            job.image,
          );
          if (copy) images[job.i] = copy;
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      setProgress("Adding items…");

      const res = await importItemsAction({
        rows: file.rows,
        map,
        fallbackTypeId,
        images,
      });
      setProgress(null);
      if (res.ok) {
        setResult(
          `Added ${res.added} item${res.added === 1 ? "" : "s"}` +
            (res.skipped ? `, skipped ${res.skipped} with problems.` : "."),
        );
        setFile(null);
      } else {
        setResult(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="sr-only">CSV file</span>
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label="CSV file"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="file:bg-secondary text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5"
        />
      </label>

      {result && (
        <p role="status" className="text-sm">
          {result}{" "}
          {result.startsWith("Added") && (
            <Link href="/" className="underline">
              See your wishlist
            </Link>
          )}
        </p>
      )}

      {file && (
        <>
          {tooMany && (
            <p role="alert" className="text-destructive text-sm">
              This file has {file.rows.length} rows. Import up to{" "}
              {MAX_IMPORT_ROWS} at a time.
            </p>
          )}

          <fieldset className="flex flex-col gap-2 rounded-xl border p-3">
            <legend className="px-1 text-sm font-medium">Columns</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FIELDS.filter(
                (f) => f.key !== "category" && f.key !== "added_on",
              ).map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <Label htmlFor={`col-${field.key}`} className="text-xs">
                    {field.label}
                  </Label>
                  <select
                    id={`col-${field.key}`}
                    className={selectClass}
                    value={map[field.key] ?? ""}
                    onChange={(e) =>
                      setMap((m) => {
                        const next = { ...m };
                        const key = field.key as FieldKey;
                        if (e.target.value === "") delete next[key];
                        else next[key] = Number(e.target.value);
                        return next;
                      })
                    }
                  >
                    <option value="">Not in file</option>
                    {file.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1">
            <Label htmlFor="fallback-type" className="text-sm">
              Item type for rows without a matching type
            </Label>
            <select
              id="fallback-type"
              className={selectClass}
              value={fallbackTypeId}
              onChange={(e) => setFallbackTypeId(e.target.value)}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
            {unmatchedTypes.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Not in your types: {unmatchedTypes.slice(0, 6).join(", ")}
                {unmatchedTypes.length > 6 ? "…" : ""}
              </p>
            )}
          </div>

          <section aria-label="Preview" className="flex flex-col gap-2">
            <p className="text-sm">
              <strong>{valid.length}</strong> item
              {valid.length === 1 ? "" : "s"} ready
              {errors.length > 0 && `, ${errors.length} with problems`}
            </p>
            <ul className="divide-y rounded-xl border text-sm">
              {valid.slice(0, 5).map((r, i) => (
                <li key={i} className="flex justify-between gap-2 px-3 py-2">
                  <span className="truncate">{r.title}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {[
                      STATUSES[r.status],
                      r.price !== null
                        ? formatCurrency(r.salePrice ?? r.price)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
            {errors.length > 0 && (
              <p className="text-muted-foreground text-xs">
                {errors.slice(0, 3).join(" · ")}
                {errors.length > 3 ? " …" : ""}
              </p>
            )}
          </section>

          <Button
            className="self-start"
            disabled={pending || tooMany || valid.length === 0}
            onClick={runImport}
          >
            <Upload />
            {pending
              ? (progress ?? "Importing…")
              : `Import ${valid.length} item${valid.length === 1 ? "" : "s"}`}
          </Button>
        </>
      )}
    </div>
  );
}
