"use client";

import React from "react";
import type { ClosedPosition } from "@/lib/types";

interface ClosedPositionsTableProps {
  positions: ClosedPosition[];
}

export function ClosedPositionsTable({ positions }: ClosedPositionsTableProps) {
  const [direction, setDirection] = React.useState<"asc" | "desc">("desc");

  const sortedPositions = React.useMemo(() => {
    const multiplier = direction === "asc" ? 1 : -1;
    return [...positions].sort(
      (a, b) => (a.realizedPnl - b.realizedPnl) * multiplier,
    );
  }, [positions, direction]);

  if (positions.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center px-1">
        <h3 className="text-lg font-bold whitespace-nowrap">Closed positions</h3>
      </div>
      <div
        data-testid="closed-positions-table"
        className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
      >
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4">Asset</th>
              <th className="px-6 py-4 text-right">Total Bought</th>
              <th className="px-6 py-4 text-right">Total Sold</th>
              <th className="px-6 py-4 text-right">
                <button
                  type="button"
                  onClick={() =>
                    setDirection((current) => (current === "asc" ? "desc" : "asc"))
                  }
                  className="flex items-center gap-1 ml-auto cursor-pointer hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  Realized P&L
                  <span className="material-symbols-outlined text-sm leading-none">
                    {direction === "asc" ? "arrow_upward" : "arrow_downward"}
                  </span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedPositions.map((position, index) => (
              <tr
                key={`${position.ticker}-${index}`}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center text-xs font-bold">
                    <span className="material-symbols-outlined text-slate-500 text-lg">
                      {position.type === "crypto" ? "currency_bitcoin" : "show_chart"}
                    </span>
                  </div>
                  <span className="text-sm font-bold">{position.ticker}</span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  $
                  {position.totalBought.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  $
                  {position.totalSold.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td
                  className={`px-6 py-4 text-right text-sm font-bold ${
                    position.realizedPnl > 0
                      ? "text-success"
                      : position.realizedPnl < 0
                        ? "text-danger"
                        : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {position.realizedPnl > 0 ? "+" : position.realizedPnl < 0 ? "-" : ""}$
                  {Math.abs(position.realizedPnl).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
