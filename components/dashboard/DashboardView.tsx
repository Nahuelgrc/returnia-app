"use client";

import React from "react";
import { User } from "next-auth";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { Header } from "@/components/dashboard/Header";
import { AddTransactionModal } from "@/components/dashboard/AddTransactionModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

import {
  addTransaction,
  deleteAssetTransactions,
} from "@/app/actions/transaction";
import { getPortfolioHistory } from "@/app/actions/portfolio";

interface DashboardViewProps {
  user?: User;
  initialAssets?: any[];
}

export function DashboardView({
  user,
  initialAssets = [],
}: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [timePeriod, setTimePeriod] = React.useState("TODO");
  const [isAddTransactionOpen, setIsAddTransactionOpen] = React.useState(false);

  const [assets, setAssets] = React.useState<any[]>(initialAssets);

  // Portfolio history for chart
  const [fullHistory, setFullHistory] = React.useState<{ date: string; value: number }[]>([]);

  React.useEffect(() => {
    const fetchHistory = async () => {
      const result = await getPortfolioHistory();
      if (result.history) {
        setFullHistory(result.history);
      }
    };
    fetchHistory();
  }, [assets]); // Refetch when assets change (new transaction added/deleted)

  // Filter history by time period
  const filteredChartData = React.useMemo(() => {
    if (fullHistory.length === 0) return [];

    const now = new Date();
    let cutoffDate: Date;

    switch (timePeriod) {
      case "1D":
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "1S":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1M":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "1A":
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // TODO
        return fullHistory;
    }

    const filtered = fullHistory.filter((p) => new Date(p.date) >= cutoffDate);
    
    // If no data in range but we have history, show at least the last known value before the cutoff
    if (filtered.length === 0 && fullHistory.length > 0) {
      const lastBefore = [...fullHistory]
        .reverse()
        .find((p) => new Date(p.date) < cutoffDate);
      if (lastBefore) {
        return [{ date: cutoffDate.toISOString().split("T")[0], value: lastBefore.value }];
      }
    }

    return filtered;
  }, [fullHistory, timePeriod]);

  // State for editing an existing asset
  const [editingAsset, setEditingAsset] = React.useState<any | null>(null);

  // State for delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Use a ref to keep track of the latest assets for the polling interval (stale closure fix)
  const assetsRef = React.useRef(assets);
  React.useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  // Fetch prices on mount and poll
  React.useEffect(() => {
    const fetchPrices = async () => {
      // Read from ref to avoid stale closures in the interval
      const currentAssetsScope = assetsRef.current;
      if (currentAssetsScope.length === 0) return;

      const symbolsToFetch = currentAssetsScope.map(
        (asset) => asset.tickerProvider,
      );

      try {
        const response = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols: symbolsToFetch }),
        });

        if (!response.ok) return;

        const quotes = await response.json();

        setAssets((prevAssets) => {
          // Double check if any assets actually changed price to prevent unnecessary re-renders
          let hasChanges = false;

          const newAssets = prevAssets.map((asset) => {
            const finnhubSymbol = asset.tickerProvider;
            const quote = quotes.find((q: any) => q.symbol === finnhubSymbol);

            if (quote && quote.price) {
              const newPrice = quote.price;
              const newChange =
                asset.averageCost > 0
                  ? ((newPrice - asset.averageCost) / asset.averageCost) * 100
                  : 0;
              const currentBalance = parseFloat(asset.balance);
              const newValue = currentBalance * newPrice;

              if (
                asset.price !== newPrice ||
                asset.change !== newChange ||
                asset.value !== newValue
              ) {
                hasChanges = true;
                return {
                  ...asset,
                  price: newPrice,
                  change: newChange,
                  value: newValue,
                };
              }
            }
            return asset;
          });

          return hasChanges ? newAssets : prevAssets;
        });
      } catch (error) {
        console.error("Error fetching prices:", error);
      }
    };

    fetchPrices();
    // Poll every 20 seconds
    const interval = setInterval(fetchPrices, 20000);
    return () => clearInterval(interval);
  }, []); // Run only once to set up the interval

  const [transactionError, setTransactionError] = React.useState<string | null>(null);

  const handleAddTransaction = async (transaction: {
    type: "buy" | "sell";
    assetType: "crypto" | "stock";
    ticker: string;
    quantity: number;
    price: number;
    date: string;
    comments?: string;
  }) => {
    setTransactionError(null);
    const result = await addTransaction(transaction);
    if (result.error) {
      setTransactionError(result.error);
      return;
    }

    setAssets((currentAssets) => {
      const existingAssetIndex = currentAssets.findIndex(
        (a) => a.ticker === transaction.ticker,
      );

      // New Asset (only on Buy)
      if (existingAssetIndex === -1) {
        if (transaction.type === "sell") return currentAssets; // Can't sell what you don't have (simplification)

        const newAsset = {
          id: Date.now(),
          name: transaction.ticker, // Simplification: using ticker as name
          ticker: transaction.ticker,
          tickerProvider:
            transaction.assetType === "crypto"
              ? `BINANCE:${transaction.ticker}USDT`
              : transaction.ticker,
          price: transaction.price,
          balance: transaction.quantity.toString(),
          value: transaction.quantity * transaction.price,
          change: 0, // No history for new asset
          icon:
            transaction.assetType === "crypto"
              ? "currency_bitcoin"
              : "show_chart",
          iconColor: "text-slate-500",
          bgColor: "bg-slate-500/10",
          type: transaction.assetType,
        };
        return [...currentAssets, newAsset];
      }

      // Existing Asset
      const updatedAssets = [...currentAssets];
      const asset = updatedAssets[existingAssetIndex];
      const currentBalance = parseFloat(asset.balance);
      let newBalance = currentBalance;

      if (transaction.type === "buy") {
        newBalance += transaction.quantity;
      } else {
        newBalance -= transaction.quantity;
      }

      // Remove if 0
      if (newBalance === 0) {
        return updatedAssets.filter((_, index) => index !== existingAssetIndex);
      }

      // Update asset
      updatedAssets[existingAssetIndex] = {
        ...asset,
        balance: newBalance.toString(),
        value: newBalance * asset.price,
      };

      return updatedAssets;
    });

    // Close modal and reset on success
    setIsAddTransactionOpen(false);
    setEditingAsset(null);
    setTransactionError(null);
  };

  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.ticker.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalBalance = assets.reduce(
    (sum, asset) => sum + asset.price * parseFloat(asset.balance),
    0,
  );

  return (
    <>
      <Header title="Dashboard" user={user} />

      <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Hero Section: Balance & Stats */}
        <section className="flex flex-col lg:flex-row gap-6 items-end justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-slate-500 dark:text-[#9da6b9] font-medium">
              Balance Total
            </p>
            <div className="flex items-baseline gap-4">
              <h1 className="text-5xl font-extrabold tracking-tight">
                $
                {totalBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h1>
            </div>
          </div>
        </section>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Right Column: Historical Performance (Span 8) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-bold">Ganancia/Pérdida histórica</h3>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 gap-1">
                {["1D", "1S", "1M", "1A", "TODO"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                      period === timePeriod
                        ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-white"
                        : "text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            {/* Chart Component Replaced Here */}
            <PortfolioChart
              className="min-h-[455px]"
              data={filteredChartData}
            />
          </div>

          {/* Left Column: Portfolio Allocation (Span 4) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <h3 className="text-lg font-bold px-1">Distribución de activos</h3>
            <AllocationChart data={assets} />
          </div>
        </div>

        {/* Assets Table (Replaced Recent Transactions) */}
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
              onClick={() => setIsAddTransactionOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add Transaction
            </button>
          </div>
          <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Activo</th>
                  <th className="px-6 py-4">Precio</th>
                  <th className="px-6 py-4">Cantidad</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4 text-right">Retorno (%)</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full ${asset.bgColor} flex items-center justify-center text-xs font-bold`}
                      >
                        <span
                          className={`material-symbols-outlined ${asset.iconColor} text-lg`}
                        >
                          {asset.icon}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-bold block">
                          {asset.name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                          {asset.ticker}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      ${asset.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {parseFloat(asset.balance).toLocaleString(undefined, {
                        maximumFractionDigits: 8,
                      })}{" "}
                      {asset.ticker}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold">
                      ${asset.value.toLocaleString()}
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
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingAsset(asset);
                            setIsAddTransactionOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-primary"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-lg">
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(asset)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-400 hover:text-danger"
                          title="Eliminar"
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
      </div>

      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        onClose={() => {
          setIsAddTransactionOpen(false);
          setEditingAsset(null);
          setTransactionError(null);
        }}
        onSubmit={handleAddTransaction}
        initialTicker={editingAsset?.ticker}
        initialQuantity={editingAsset?.balance}
        initialAssetType={editingAsset?.type}
        error={transactionError}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setIsDeleting(true);
          const result = await deleteAssetTransactions(deleteTarget.ticker);
          if (result.error) {
            console.error(result.error);
          } else {
            setAssets((prev) =>
              prev.filter((a) => a.ticker !== deleteTarget.ticker),
            );
          }
          setIsDeleting(false);
          setDeleteTarget(null);
        }}
        title="Eliminar activo"
        message={`¿Estás seguro de que querés eliminar todas las transacciones de ${deleteTarget?.ticker}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
