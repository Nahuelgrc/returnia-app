"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  isLoading?: boolean;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar",
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const iconColor =
    variant === "danger"
      ? "text-red-500 bg-red-500/10"
      : "text-amber-500 bg-amber-500/10";

  const confirmBtnColor =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
      : "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-full ${iconColor} flex items-center justify-center`}
          >
            <span className="material-symbols-outlined text-2xl">
              {variant === "danger" ? "delete_forever" : "warning"}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-foreground">{title}</h3>

          {/* Message */}
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-xl text-white ${confirmBtnColor} transition-all active:scale-95 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {isLoading && (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
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
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
