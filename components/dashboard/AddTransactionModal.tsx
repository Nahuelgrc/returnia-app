"use client";
import React, { useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useAssetSearch } from "@/hooks/useAssetSearch";
import { useAssetPrice } from "@/hooks/useAssetPrice";
import type {
  AssetType,
  Side,
  TransactionPayload,
} from "@/lib/schemas/transaction";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: TransactionPayload) => void | Promise<void>;
  initialTicker?: string;
  initialQuantity?: string;
  initialAssetType?: AssetType;
  initialTransaction?: TransactionPayload;
  error?: string | null;
  isEditingAsset?: boolean;
}

const currentLocalDateTime = (from = new Date()) => {
  const now = from;
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export const AddTransactionModal = (props: AddTransactionModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.isEditingAsset ? "Edit Transaction" : "Add Transaction"}
      disableClose={isSubmitting}
    >
      <TransactionForm
        {...props}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
      />
    </Modal>
  );
};

interface TransactionFormProps extends AddTransactionModalProps {
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

const TransactionForm = ({
  onClose,
  onSubmit,
  initialTicker,
  initialQuantity,
  initialAssetType,
  initialTransaction,
  error,
  isEditingAsset,
  isSubmitting,
  setIsSubmitting,
}: TransactionFormProps) => {
  const [transactionType, setTransactionType] = useState<Side>(
    initialTransaction?.type ?? "buy",
  );
  const [assetType, setAssetType] = useState<AssetType>(
    initialTransaction?.assetType || initialAssetType || "crypto",
  );
  const [ticker, setTicker] = useState(initialTransaction?.ticker ?? initialTicker ?? "");
  const [quantity, setQuantity] = useState(
    initialTransaction ? String(initialTransaction.quantity) : initialQuantity || "",
  );
  const [date, setDate] = useState(() =>
    initialTransaction
      ? currentLocalDateTime(new Date(initialTransaction.date))
      : currentLocalDateTime(),
  );
  const [comments, setComments] = useState(initialTransaction?.comments ?? "");
  const [priceMode, setPriceMode] = useState<"unit" | "total">("unit");
  const [totalSpent, setTotalSpent] = useState("");

  const [showDropdown, setShowDropdown] = useState(false);
  const submittingRef = useRef(false);

  // Use custom hooks for decoupled logic
  const { searchResults, isSearching } = useAssetSearch(ticker, assetType, showDropdown);
  const { price, setPrice, isFetchingPrice } = useAssetPrice(
    ticker,
    assetType,
    initialTransaction ? String(initialTransaction.price) : "",
  );

  const quantityNum = Number(quantity);
  const totalSpentNum = Number(totalSpent);
  const computedUnitPrice =
    priceMode === "total" &&
    quantity.trim() !== "" &&
    totalSpent.trim() !== "" &&
    quantityNum > 0 &&
    totalSpentNum > 0
      ? totalSpentNum / quantityNum
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (priceMode === "total" && computedUnitPrice === null) return;
    const unitPrice = priceMode === "total" ? computedUnitPrice! : Number(price);
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit({
        type: transactionType,
        assetType,
        ticker,
        quantity: quantityNum,
        price: unitPrice,
        date: Number.isNaN(new Date(date).getTime())
          ? date
          : new Date(date).toISOString(),
        comments: comments.trim() ? comments : undefined,
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm font-medium">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}
        <fieldset disabled={isSubmitting} className="contents">
        {/* Transaction Type Selector (Buy/Sell) */}
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setTransactionType("buy")}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              transactionType === "buy"
                ? "bg-success/10 text-success shadow-sm"
                : "text-slate-500 hover:text-foreground"
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setTransactionType("sell")}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              transactionType === "sell"
                ? "bg-danger/10 text-danger shadow-sm"
                : "text-slate-500 hover:text-foreground"
            }`}
          >
            Sell
          </button>
        </div>

        {/* Asset Type Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setAssetType("crypto")}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              assetType === "crypto"
                ? "bg-white dark:bg-slate-800 shadow-sm text-primary"
                : "text-slate-500 hover:text-foreground"
            }`}
          >
            Crypto
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setAssetType("stock")}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              assetType === "stock"
                ? "bg-white dark:bg-slate-800 shadow-sm text-primary"
                : "text-slate-500 hover:text-foreground"
            }`}
          >
            Stocks
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">
            Date and Time
          </label>
          <input
            type="datetime-local"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5 relative">
          <label className="text-xs font-bold text-slate-500 uppercase">
            Ticker / Symbol
          </label>
          <input
            type="text"
            required
            placeholder={assetType === "crypto" ? "BTC" : "AAPL"}
            value={ticker}
            onChange={(e) => {
              setTicker(e.target.value.toUpperCase());
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
          />

          {/* Autocomplete Dropdown */}
          {showDropdown && ticker.trim() !== "" && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 max-h-[220px] overflow-y-auto custom-scrollbar">
              {isSearching ? (
                <div className="p-4 text-center text-sm font-bold text-slate-400 flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <ul className="flex flex-col p-1">
                  {searchResults.map((result, idx) => (
                    <li
                      key={idx}
                      onClick={() => {
                        setTicker(result.displaySymbol);
                        setShowDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors flex items-center justify-between group"
                    >
                      <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                        {result.displaySymbol}
                      </span>
                      <span className="text-xs text-slate-500 font-medium truncate max-w-[160px]">
                        {result.description}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-sm font-bold text-slate-400">
                  No results
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Quantity
            </label>
            <input
              type="number"
              required
              step="any"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => {
                const val = e.target.value;
                // Allow empty, integers, or decimals up to 8 digits
                if (val === "" || /^\d*\.?\d{0,8}$/.test(val)) {
                  setQuantity(val);
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase">
                {priceMode === "unit" ? "Unit Price" : "Total Spent"}
              </label>
              <div className="flex items-center gap-2">
                {isFetchingPrice && priceMode === "unit" && (
                  <span className="text-[10px] text-primary flex items-center gap-1 font-bold animate-pulse">
                    <svg
                      className="h-3 w-3 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Searching...
                  </span>
                )}
                <div className="flex bg-slate-100 dark:bg-slate-900 rounded-md p-0.5">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setPriceMode("unit")}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all ${
                      priceMode === "unit"
                        ? "bg-white dark:bg-slate-800 shadow-sm text-primary"
                        : "text-slate-500 hover:text-foreground"
                    }`}
                  >
                    Unit
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setPriceMode("total")}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all ${
                      priceMode === "total"
                        ? "bg-white dark:bg-slate-800 shadow-sm text-primary"
                        : "text-slate-500 hover:text-foreground"
                    }`}
                  >
                    Total
                  </button>
                </div>
              </div>
            </div>
            {priceMode === "unit" ? (
              <input
                type="number"
                required
                step="any"
                placeholder="$0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            ) : (
              <>
                <input
                  type="number"
                  required
                  step="any"
                  placeholder="$0.00"
                  value={totalSpent}
                  onChange={(e) => setTotalSpent(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                />
                <span className="text-[11px] text-slate-500 font-medium">
                  {computedUnitPrice !== null
                    ? `≈ $${computedUnitPrice.toFixed(2)} / unit`
                    : "—"}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-xs font-bold text-slate-500 uppercase">
            Comments (Optional)
          </label>
          <textarea
            placeholder="Why or how did you make this move?"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all min-h-[80px] resize-y"
          />
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting && (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {isEditingAsset
              ? isSubmitting
                ? "Saving..."
                : "Save"
              : isSubmitting
                ? "Adding..."
                : "Add"}
          </button>
        </div>
        </fieldset>
      </form>
    </>
  );
};
