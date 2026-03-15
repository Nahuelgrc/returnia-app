import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground font-display">
      <main className="w-full max-w-7xl mx-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
