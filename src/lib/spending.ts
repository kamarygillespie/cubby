// Spending by month (KAM-55). Pure, so it's unit-tested; the chart runs it in
// the browser so months follow the viewer's own time zone (an 11pm purchase
// on the 31st stays in that month).

export type Purchase = {
  id: string;
  title: string;
  date: string | null; // purchased_date (ISO), null if unknown
  amount: number; // effective price paid
  category: string;
};

export type MonthKey = string; // "2026-03"

export type MonthSpending = {
  key: MonthKey;
  total: number;
  count: number;
  purchases: Purchase[];
  byCategory: { category: string; total: number; count: number }[];
};

export const localMonthKey = (iso: string): MonthKey => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export function lastMonthKeys(now: Date, n = 12): MonthKey[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

export function yearMonthKeys(year: number): MonthKey[] {
  return Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// One entry per requested month (empty months included, so the chart has a
// steady x-axis); purchases outside those months are ignored.
export function spendingByMonth(
  purchases: Purchase[],
  months: MonthKey[],
  keyOf: (iso: string) => MonthKey = localMonthKey,
): MonthSpending[] {
  const byMonth = new Map(months.map((key) => [key, [] as Purchase[]]));
  for (const p of purchases) {
    if (!p.date) continue;
    byMonth.get(keyOf(p.date))?.push(p);
  }
  return months.map((key) => {
    const list = byMonth.get(key)!;
    const cats = new Map<string, { total: number; count: number }>();
    for (const p of list) {
      const c = cats.get(p.category) ?? { total: 0, count: 0 };
      c.total = round2(c.total + p.amount);
      c.count++;
      cats.set(p.category, c);
    }
    return {
      key,
      total: round2(list.reduce((s, p) => s + p.amount, 0)),
      count: list.length,
      purchases: [...list].sort((a, b) => (a.date! < b.date! ? 1 : -1)),
      byCategory: [...cats]
        .map(([category, c]) => ({ category, ...c }))
        .sort(
          (a, b) => b.total - a.total || a.category.localeCompare(b.category),
        ),
    };
  });
}

// Years that have dated purchases, newest first.
export function purchaseYears(
  purchases: Purchase[],
  keyOf: (iso: string) => MonthKey = localMonthKey,
): number[] {
  const years = new Set(
    purchases.flatMap((p) =>
      p.date ? [Number(keyOf(p.date).slice(0, 4))] : [],
    ),
  );
  return [...years].sort((a, b) => b - a);
}

// Purchases with no date: counted separately rather than dropped.
export function undatedSpending(purchases: Purchase[]) {
  const undated = purchases.filter((p) => !p.date);
  return {
    total: round2(undated.reduce((s, p) => s + p.amount, 0)),
    count: undated.length,
  };
}

export function monthLabel(key: MonthKey, style: "short" | "long" = "short") {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: style,
    ...(style === "long" ? { year: "numeric" } : {}),
  });
}
