"use client";

import React from "react";
import type { Asset } from "@/lib/types";

interface AssetsTableProps {
  assets: Asset[];
  onAdd: () => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

type SortKey = "name" | "balance" | "value" | "change" | "unrealizedPnl";
type SortDirection = "asc" | "desc";

export function AssetsTable({ assets, onAdd, onEdit, onDelete }: AssetsTableProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; direction: SortDirection } | null>(null);

  const query = searchQuery.toLowerCase();
  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(query) ||
      asset.ticker.toLowerCase().includes(query),
  );

  const sortedAssets = React.useMemo(() => {
    if (!sort) return filteredAssets;
    const { key, direction } = sort;
    const multiplier = direction === "asc" ? 1 : -1;
    return [...filteredAssets].sort((a, b) => {
      if (key === "name") {
        return a.name.localeCompare(b.name) * multiplier;
      }
      const aValue = key === "balance" ? parseFloat(a.balance) : a[key];
      const bValue = key === "balance" ? parseFloat(b.balance) : b[key];
      return (aValue - bValue) * multiplier;
    });
  }, [filteredAssets, sort]);

  function handleSort(key: SortKey) {
    setSort((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }

  function sortIcon(key: SortKey) {
    if (sort?.key !== key) return "unfold_more";
    return sort.direction === "asc" ? "arrow_upward" : "arrow_downward";
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1 gap-4">
        <div className="flex items-center gap-4 flex-1">
          <h3 className="text-lg font-bold whitespace-nowrap">Assets</h3>
          <div className="relative w-full max-w-xs md:block hidden">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl leading-none">
              search
            </span>
            <input
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-primary outline-none text-foreground placeholder-slate-400 shadow-sm"
              placeholder="Search assets..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Transaction
        </button>
      </div>
      <div
        data-testid="assets-table"
        className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
      >
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 cursor-pointer hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  Asset
                  <span className="material-symbols-outlined text-sm leading-none">
                    {sortIcon("name")}
                  </span>
                </button>
              </th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Entry Price</th>
              <th className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => handleSort("balance")}
                  className="flex items-center gap-1 cursor-pointer hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  Quantity
                  <span className="material-symbols-outlined text-sm leading-none">
                    {sortIcon("balance")}
                  </span>
                </button>
              </th>
              <th className="px-6 py-4 text-right">
                <button
                  type="button"
                  onClick={() => handleSort("value")}
                  className="flex items-center gap-1 ml-auto cursor-pointer hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  Value
                  <span className="material-symbols-outlined text-sm leading-none">
                    {sortIcon("value")}
                  </span>
                </button>
              </th>
              <th className="px-6 py-4 text-right">
                <button
                  type="button"
                  onClick={() => handleSort("change")}
                  className="flex items-center gap-1 ml-auto cursor-pointer hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  Return (%)
                  <span className="material-symbols-outlined text-sm leading-none">
                    {sortIcon("change")}
                  </span>
                </button>
              </th>
              <th className="px-6 py-4 text-right">
                <button
                  type="button"
                  onClick={() => handleSort("unrealizedPnl")}
                  className="flex items-center gap-1 ml-auto cursor-pointer hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  Unrealized P&L
                  <span className="material-symbols-outlined text-sm leading-none">
                    {sortIcon("unrealizedPnl")}
                  </span>
                </button>
              </th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedAssets.map((asset) => (
              <tr
                key={asset.ticker}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center text-xs font-bold">
                    <span className="material-symbols-outlined text-slate-500 text-lg">
                      {asset.type === "crypto" ? "currency_bitcoin" : "show_chart"}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-bold block">{asset.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      {asset.ticker}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  ${asset.price.toLocaleString("en-US")}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  ${asset.averageCost.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  {parseFloat(asset.balance).toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {asset.ticker}
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold">
                  ${asset.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right">
                  <div
                    className={`inline-flex items-center gap-1 text-xs font-bold ${
                      asset.change >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {asset.change >= 0 ? "trending_up" : "trending_down"}
                    </span>
                    {asset.change > 0 ? "+" : ""}
                    {asset.change.toFixed(2)}%
                  </div>
                </td>
                <td
                  className={`px-6 py-4 text-right text-sm font-bold ${
                    asset.unrealizedPnl > 0
                      ? "text-success"
                      : asset.unrealizedPnl < 0
                        ? "text-danger"
                        : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {asset.unrealizedPnl > 0 ? "+" : asset.unrealizedPnl < 0 ? "-" : ""}$
                  {Math.abs(asset.unrealizedPnl).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => onEdit(asset)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-primary"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-lg">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={() => onDelete(asset)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-400 hover:text-danger"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-lg">
                        delete
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
