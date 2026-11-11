"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { User } from "next-auth";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { Header } from "@/components/dashboard/Header";
import { HeroBalance } from "@/components/dashboard/HeroBalance";
import { AssetsTable } from "@/components/dashboard/AssetsTable";
import { Sidebar, type DashboardViewKey } from "@/components/dashboard/Sidebar";
import { TransactionsHistory } from "@/components/dashboard/TransactionsHistory";
import { AddTransactionModal } from "@/components/dashboard/AddTransactionModal";
import { ImportTransactionsModal } from "@/components/dashboard/ImportTransactionsModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  addTransaction,
  deleteAssetTransactions,
  deleteTransaction,
  importTransactions,
  updateTransaction,
} from "@/app/actions/transaction";
import { usePortfolioPrices } from "@/hooks/usePortfolioPrices";
import { PERIODS, filterHistoryByPeriod, type Period } from "@/lib/chart";
import { buildAssets, totalInvested, totalValue } from "@/lib/portfolio-view";
import type { TransactionPayload } from "@/lib/schemas/transaction";
import type { Asset, HistoryPoint, Holding, TransactionRecord } from "@/lib/types";

interface DashboardViewProps {
  user?: User;
  holdings: Holding[];
  history: HistoryPoint[];
  transactions: TransactionRecord[];
  realizedPnl: number;
}

export function DashboardView({
  user,
  holdings,
  history,
  transactions,
  realizedPnl,
}: DashboardViewProps) {
  const router = useRouter();
  const [view, setView] = React.useState<DashboardViewKey>("dashboard");
  const [timePeriod, setTimePeriod] = React.useState<Period>("ALL");
  const [isAddTransactionOpen, setIsAddTransactionOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [editingTransaction, setEditingTransaction] =
    React.useState<TransactionRecord | null>(null);
  const [deleteTransactionTarget, setDeleteTransactionTarget] =
    React.useState<TransactionRecord | null>(null);
  const [transactionError, setTransactionError] = React.useState<string | null>(
    null,
  );

  const quotes = usePortfolioPrices(holdings);
  const assets = React.useMemo(
    () => buildAssets(holdings, quotes),
    [holdings, quotes],
  );
  const chartData = React.useMemo(
    () => filterHistoryByPeriod(history, timePeriod),
    [history, timePeriod],
  );

  const closeModal = () => {
    setIsAddTransactionOpen(false);
    setEditingAsset(null);
    setEditingTransaction(null);
    setTransactionError(null);
  };

  const handleAddTransaction = async (transaction: TransactionPayload) => {
    setTransactionError(null);
    try {
      const result = editingTransaction
        ? await updateTransaction(editingTransaction.id, transaction)
        : await addTransaction(transaction);
      if (result.error) {
        setTransactionError(result.error);
        return;
      }
      router.refresh();
      closeModal();
    } catch {
      setTransactionError("Error saving the transaction");
    }
  };

  const handleImport = async (content: string) => {
    const result = await importTransactions(content);
    if ("success" in result) router.refresh();
    return result;
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteAssetTransactions(deleteTarget.ticker);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      router.refresh();
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!deleteTransactionTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteTransaction(deleteTransactionTarget.id);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      router.refresh();
    }
    setIsDeleting(false);
    setDeleteTransactionTarget(null);
  };

  return (
    <>
      <Header
        title={view === "dashboard" ? "Dashboard" : "Transaction History"}
        user={user}
      />

      <div className="flex flex-col md:flex-row w-full">
      <Sidebar active={view} onSelect={setView} />
      <div className="p-8 flex-1 min-w-0 flex flex-col gap-8">
        {deleteError && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {deleteError}
          </div>
        )}

        {view === "dashboard" ? (
        <>
        <HeroBalance
          total={totalValue(assets)}
          invested={totalInvested(assets)}
          realizedPnl={realizedPnl}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-bold">Invested capital</h3>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 gap-1">
                {PERIODS.map((period) => (
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
            <PortfolioChart className="min-h-[455px]" data={chartData} />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <h3 className="text-lg font-bold px-1">Asset allocation</h3>
            <AllocationChart data={assets} />
          </div>
        </div>

        <AssetsTable
          assets={assets}
          onAdd={() => {
            setTransactionError(null);
            setIsAddTransactionOpen(true);
          }}
          onEdit={(asset) => {
            setTransactionError(null);
            setEditingAsset(asset);
            setIsAddTransactionOpen(true);
          }}
          onDelete={setDeleteTarget}
        />

        </>
        ) : (
          <TransactionsHistory
            transactions={transactions}
            onEdit={(transaction) => {
              setTransactionError(null);
              setEditingTransaction(transaction);
              setIsAddTransactionOpen(true);
            }}
            onDelete={setDeleteTransactionTarget}
            onImport={() => setIsImportOpen(true)}
          />
        )}
      </div>
      </div>

      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        onClose={closeModal}
        onSubmit={handleAddTransaction}
        initialTicker={editingAsset?.ticker}
        initialQuantity={editingAsset?.balance}
        initialAssetType={editingAsset?.type}
        initialTransaction={
          editingTransaction
            ? {
                type: editingTransaction.side,
                assetType: editingTransaction.assetType,
                ticker: editingTransaction.ticker,
                quantity: editingTransaction.quantity,
                price: editingTransaction.price,
                date: editingTransaction.executedAt,
                comments: editingTransaction.comments ?? undefined,
              }
            : undefined
        }
        error={transactionError}
        isEditingAsset={!!editingAsset || !!editingTransaction}
      />

      <ImportTransactionsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete asset"
        message={`Are you sure you want to delete all transactions for ${deleteTarget?.ticker}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={!!deleteTransactionTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTransactionTarget(null);
        }}
        onConfirm={handleConfirmDeleteTransaction}
        title="Delete transaction"
        message={`Are you sure you want to delete this ${deleteTransactionTarget?.side} of ${deleteTransactionTarget?.quantity} ${deleteTransactionTarget?.ticker}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
