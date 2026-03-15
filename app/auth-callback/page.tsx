"use client";

import { useEffect } from "react";

export default function AuthCallbackPage() {
  useEffect(() => {
    // Notify the opener window that authentication is complete
    if (window.opener) {
      window.opener.postMessage("auth-success", window.location.origin);
      window.close();
    } else {
      // Fallback if not in a popup: redirect to dashboard
      window.location.href = "/dashboard";
    }
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">Autenticando...</h2>
        <p className="text-sm text-slate-400">Ya puedes cerrar esta ventana.</p>
      </div>
    </div>
  );
}
