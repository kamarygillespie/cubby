"use client";

import { useEffect, useId, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { summarizePrices, type PricePoint } from "@/lib/price-history";
import { priceHistoryAction } from "./items/price-actions";

const W = 320;
const H = 96;
const PAD_X = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 14;

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Price history in an item's details (KAM-95). One series, so no legend: the
// heading names it. A step line (a price holds until it changes), a
// crosshair that snaps to the nearest change on hover or with arrow keys,
// and a table for screen readers.
export function PriceHistory({ itemId }: { itemId: string }) {
  const [points, setPoints] = useState<PricePoint[] | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();

  useEffect(() => {
    let live = true;
    void priceHistoryAction(itemId).then((p) => live && setPoints(p));
    return () => {
      live = false;
    };
  }, [itemId]);

  const summary = points ? summarizePrices(points) : null;
  if (!points || !summary) return null;

  const times = points.map((p) => Date.parse(p.at));
  const t0 = times[0];
  const t1 = Math.max(times[times.length - 1], t0 + 1);
  const lo = Math.min(...points.map((p) => p.price));
  const hi = Math.max(...points.map((p) => p.price));
  const span = hi - lo || hi * 0.1 || 1;
  const x = (t: number) => PAD_X + ((t - t0) / (t1 - t0)) * (W - 2 * PAD_X);
  const y = (v: number) =>
    PAD_TOP + (1 - (v - lo) / span) * (H - PAD_TOP - PAD_BOTTOM);

  // Step path: hold each price until the next change.
  const d = points
    .map((p, i) =>
      i === 0
        ? `M${x(times[0])},${y(p.price)}`
        : `H${x(times[i])}V${y(p.price)}`,
    )
    .join("");
  const nearest = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(x(times[i]) - px) < Math.abs(x(times[best]) - px)) best = i;
    }
    return best;
  };
  const shown = active ?? points.length - 1;

  return (
    <section aria-labelledby={`${tableId}-h`} className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id={`${tableId}-h`} className="text-sm font-medium">
          Price history
        </h3>
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {day(points[shown].at)} · {formatCurrency(points[shown].price)}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="text-brand focus-visible:ring-ring/50 h-24 w-full touch-none overflow-visible rounded outline-none focus-visible:ring-2"
        role="img"
        aria-label={`Price over time. ${summary.atLowest ? "Now at its lowest" : `Lowest ${formatCurrency(summary.low)}`}, now ${formatCurrency(summary.now)}.`}
        aria-describedby={tableId}
        tabIndex={0}
        onPointerMove={(e) =>
          setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))
        }
        onPointerLeave={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const step = e.key === "ArrowLeft" ? -1 : 1;
            setActive((a) =>
              Math.min(
                points.length - 1,
                Math.max(0, (a ?? points.length - 1) + step),
              ),
            );
          }
        }}
        onBlur={() => setActive(null)}
      >
        {/* Recessive baseline at the low. */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={y(lo)}
          y2={y(lo)}
          className="stroke-border"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {active !== null && (
          <line
            x1={x(times[active])}
            x2={x(times[active])}
            y1={PAD_TOP - 6}
            y2={H - PAD_BOTTOM + 4}
            className="stroke-muted-foreground"
            strokeWidth={1}
          />
        )}
        {/* The latest price, and the hovered one, as ≥8px markers with a
            surface ring so they stay distinct from the line. */}
        {[shown].map((i) => (
          <circle
            key={i}
            cx={x(times[i])}
            cy={y(points[i].price)}
            r={4.5}
            fill="currentColor"
            // The details sheet's own surface, so the ring reads as a gap.
            className="stroke-popover"
            strokeWidth={2}
          />
        ))}
        <text
          x={PAD_X}
          y={H - 1}
          className="fill-muted-foreground"
          fontSize={10}
        >
          {day(points[0].at)}
        </text>
        <text
          x={W - PAD_X}
          y={H - 1}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={10}
        >
          {day(points[points.length - 1].at)}
        </text>
      </svg>
      <p className="text-muted-foreground text-xs">
        {summary.atLowest
          ? `Lowest price since ${day(points[0].at)}.`
          : `Lowest ${formatCurrency(summary.low)} on ${day(summary.lowAt)} · now ${formatCurrency(summary.now)}.`}
      </p>
      <table id={tableId} className="sr-only">
        <caption>Price history</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Price</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.at}>
              <td>{day(p.at)}</td>
              <td>{formatCurrency(p.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
