import { describe, expect, it } from "vitest";
import { parseCsv, toCsv, unguardCell } from "./csv";

describe("CSV", () => {
  it("round-trips commas, quotes, newlines and blanks", () => {
    const rows = [
      ["title", "notes", "price"],
      ['Boots, "the good ones"', "line one\nline two", "120"],
      ["Tee", "", ""],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it("reads CRLF or LF, a byte-order mark, and skips blank lines", () => {
    expect(parseCsv("﻿a,b\r\n1,2\n\n3,4\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("guards cells a spreadsheet would run as formulas", () => {
    const csv = toCsv([['=HYPERLINK("x")', "+1", "-wait", "@me", "fine"]]);
    expect(csv.startsWith(`"'=HYPERLINK(""x"")",'+1,'-wait,'@me,fine`)).toBe(
      true,
    );
    expect(parseCsv(csv)[0].map(unguardCell)).toEqual([
      '=HYPERLINK("x")',
      "+1",
      "-wait",
      "@me",
      "fine",
    ]);
  });

  it("leaves ordinary apostrophes alone", () => {
    expect(unguardCell("'90s jacket")).toBe("'90s jacket");
  });
});
