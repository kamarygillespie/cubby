// Minimal RFC 4180 CSV (KAM-87): quoted fields, embedded commas, quotes and
// newlines, CRLF or LF, and a leading byte-order mark. Pure and tested.

// Spreadsheet apps treat a cell starting with one of these as a formula. On
// export such cells get a leading apostrophe, which spreadsheets hide and
// parseCsv's caller strips again (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

function escapeCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row.map((cell) => escapeCell(cell == null ? "" : String(cell))).join(","),
    )
    .join("\r\n");
}

// Undoes the export's formula guard.
export function unguardCell(value: string): string {
  return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
}

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // Blank lines aren't rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
