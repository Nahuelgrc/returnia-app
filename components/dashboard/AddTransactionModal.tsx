"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useAssetSearch } from "@/hooks/useAssetSearch";
import { useAssetPrice } from "@/hooks/useAssetPrice";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: {
    type: "buy" | "sell";
    assetType: "crypto" | "stock";
    ticker: string;
    quantity: number;
    price: number;
    date: string;
    comments?: string;
  }) => void;
  initialTicker?: string;
  initialQuantity?: string;
  initialAssetType?: "crypto" | "stock";
  error?: string | null;
}

export const AddTransactionModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialTicker,
  initialQuantity,
  initialAssetType,
  error,
}: AddTransactionModalProps) => {
  const [transactionType, setTransactionType] = useState<"buy" | "sell">("buy");
  const [assetType, setAssetType] = useState<"crypto" | "stock">("crypto");
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState("");
  const [comments, setComments] = useState("");
  
  const [showDropdown, setShowDropdown] = useState(false);

  // Use custom hooks for decoupled logic
  const { searchResults, isSearching } = useAssetSearch(ticker, assetType, showDropdown);
  const { price, setPrice, isFetchingPrice } = useAssetPrice(ticker, assetType, !showDropdown);

  // Initialize form when modal opens (including pre-fill values)
  React.useEffect(() => {
    if (isOpen) {
      // Always reset to pristine state first
      setTransactionType("buy");
      setAssetType(initialAssetType || "crypto");
      setTicker(initialTicker || "");
      setQuantity(initialQuantity || "");
      setPrice("");
      setComments("");
      setShowDropdown(false);

      const now = new Date();
      const localIsoString = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16);
      setDate(localIsoString);
    }
  }, [isOpen, initialTicker, initialQuantity, initialAssetType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      type: transactionType,
      assetType,
      ticker,
      quantity: Number(quantity),
      price: Number(price),
      date,
      comments: comments.trim() ? comments : undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar Transacción">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm font-medium">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}
        {/* Transaction Type Selector (Buy/Sell) */}
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setTransactionType("buy")}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              transactionType === "buy"
                ? "bg-success/10 text-success shadow-sm"
                : "text-slate-500 hover:text-foreground"
            }`}
          >
            Comprar
          </button>
          <button
            type="button"
            onClick={() => setTransactionType("sell")}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              transactionType === "sell"
                ? "bg-danger/10 text-danger shadow-sm"
                : "text-slate-500 hover:text-foreground"
            }`}
          >
            Vender
          </button>
        </div>

        {/* Asset Type Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
          <button
            type="button"
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
            onClick={() => setAssetType("stock")}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              assetType === "stock"
                ? "bg-white dark:bg-slate-800 shadow-sm text-primary"
                : "text-slate-500 hover:text-foreground"
            }`}
          >
            Acciones
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">
            Fecha y Hora
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
                  Buscando...
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
                  Sin resultados
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Cantidad
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
                Precio Unitario
              </label>
              {isFetchingPrice && (
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
                  Buscando...
                </span>
              )}
            </div>
            <input
              type="number"
              required
              step="any"
              placeholder="$0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-xs font-bold text-slate-500 uppercase">
            Comentarios (Opcional)
          </label>
          <textarea
            placeholder="¿Por qué o cómo hiciste este movimiento?"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all min-h-[80px] resize-y"
          />
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all"
          >
            Agregar
          </button>
        </div>
      </form>
    </Modal>
  );
};
