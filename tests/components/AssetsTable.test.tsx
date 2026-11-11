import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AssetsTable } from "@/components/dashboard/AssetsTable";
import type { Asset } from "@/lib/types";

const asset: Asset = {
  ticker: "BTC",
  type: "crypto",
  balance: "2",
  averageCost: 1234.5,
  realizedPnl: 0,
  name: "BTC",
  price: 2000,
  value: 4000,
  change: 62,
};

describe("AssetsTable", () => {
  it("shows the entry price next to the price", () => {
    render(
      <AssetsTable assets={[asset]} onAdd={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    const table = screen.getByTestId("assets-table");
    expect(within(table).getByText("Entry Price")).toBeInTheDocument();
    expect(within(table).getByText("$1,234.5")).toBeInTheDocument();
    expect(within(table).getByText("$2,000")).toBeInTheDocument();
  });

  it("shows the realized P&L per asset colored by sign", () => {
    render(
      <AssetsTable
        assets={[
          { ...asset, realizedPnl: 1500.5 },
          { ...asset, ticker: "ETH", name: "ETH", realizedPnl: -25 },
        ]}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const table = screen.getByTestId("assets-table");
    expect(within(table).getByText("Realized P&L")).toBeInTheDocument();
    expect(within(table).getByText("+$1,500.50")).toHaveClass("text-success");
    expect(within(table).getByText("-$25.00")).toHaveClass("text-danger");
  });
});
