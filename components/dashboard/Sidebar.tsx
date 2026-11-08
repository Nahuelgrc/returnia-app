"use client";

export type DashboardViewKey = "dashboard" | "transactions";

const ITEMS: { key: DashboardViewKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "transactions", label: "Transaction History", icon: "receipt_long" },
];

interface SidebarProps {
  active: DashboardViewKey;
  onSelect: (view: DashboardViewKey) => void;
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <nav
      aria-label="Sections"
      className="flex md:flex-col gap-1 p-4 border-b md:border-b-0 md:border-r border-sidebar-border md:w-60 md:shrink-0 overflow-x-auto"
    >
      {ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          aria-current={item.key === active ? "page" : undefined}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
            item.key === active
              ? "bg-primary/10 text-primary"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-foreground"
          }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xl leading-none">
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
