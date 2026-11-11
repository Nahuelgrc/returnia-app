"use client";

import type { TransactionRecord } from "@/lib/types";

interface TransactionsHistoryProps {
  transactions: TransactionRecord[];
  onEdit: (transaction: TransactionRecord) => void;
  onDelete: (transaction: TransactionRecord) => void;
  onImport: () => void;
}

export function TransactionsHistory({
  transactions,
  onEdit,
  onDelete,
  onImport,
}: TransactionsHistoryProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex justify-end gap-3">
        <button
          onClick={onImport}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-lg">upload</span>
          Import CSV
        </button>
        <a
          href="/api/transactions/export"
          download
          className="flex items-center gap-2 px-4 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold rounded-lg transition-all active:scale-95 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Export CSV
        </a>
      </div>
      <div
        data-testid="transactions-history"
        className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
      >
        {transactions.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-500 dark:text-slate-400 text-center">
            No transactions yet.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 sticky top-0">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Asset</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Quantity</th>
                  <th className="px-6 py-4 text-right">Unit Price</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4">Comments</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                      {new Date(transaction.executedAt).toLocaleDateString("en-US")}{" "}
                      {new Date(transaction.executedAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold">{transaction.ticker}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center text-xs font-bold ${
                          transaction.side === "buy" ? "text-success" : "text-danger"
                        }`}
                      >
                        {transaction.side === "buy" ? "Buy" : "Sell"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right">
                      {transaction.quantity.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right">
                      ${transaction.price.toLocaleString("en-US")}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right">
                      $
                      {(transaction.quantity * transaction.price).toLocaleString(
                        "en-US",
                        { maximumFractionDigits: 2 },
                      )}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]"
                      title={transaction.comments || undefined}
                    >
                      {transaction.comments || "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => onEdit(transaction)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-primary"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-lg">
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => onDelete(transaction)}
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
        )}
      </div>
    </section>
  );
}
