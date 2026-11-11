import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AssetsTable } from "@/components/dashboard/AssetsTable";
import type { Asset } from "@/lib/types";

const asset: Asset = {
  ticker: "BTC",
  type: "crypto",
  balance: "2",
  averageCost: 1234.5,
  unrealizedPnl: 0,
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

  it("limits the entry price to 2 decimals keeping thousands separator", () => {
    render(
      <AssetsTable
        assets={[{ ...asset, averageCost: 623.052 }, { ...asset, ticker: "ETH", name: "ETH", averageCost: 12345.678 }]}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const table = screen.getByTestId("assets-table");
    expect(within(table).getByText("$623.05")).toBeInTheDocument();
    expect(within(table).getByText("$12,345.68")).toBeInTheDocument();
  });

  it("shows the unrealized P&L per asset colored by sign", () => {
    render(
      <AssetsTable
        assets={[
          { ...asset, unrealizedPnl: 1500.5 },
          { ...asset, ticker: "ETH", name: "ETH", unrealizedPnl: -25 },
          { ...asset, ticker: "SOL", name: "SOL", unrealizedPnl: 0 },
        ]}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const table = screen.getByTestId("assets-table");
    expect(within(table).getByText("Unrealized P&L")).toBeInTheDocument();
    expect(within(table).getByText("+$1,500.50")).toHaveClass("text-success");
    expect(within(table).getByText("-$25.00")).toHaveClass("text-danger");
    const zero = within(table).getByText("$0.00");
    expect(zero).toHaveClass("text-slate-500");
    expect(zero).not.toHaveClass("text-success");
  });

  it("sorts by unrealized P&L asc then desc", () => {
    render(
      <AssetsTable
        assets={[
          { ...asset, ticker: "AAA", name: "AAA", unrealizedPnl: 10 },
          { ...asset, ticker: "BBB", name: "BBB", unrealizedPnl: -5 },
          { ...asset, ticker: "CCC", name: "CCC", unrealizedPnl: 100 },
        ]}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const table = screen.getByTestId("assets-table");
    const order = () =>
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getByText(/^(AAA|BBB|CCC)$/, { selector: "span.block" }).textContent);
    const header = within(table).getByRole("button", { name: /Unrealized P&L/ });

    fireEvent.click(header);
    expect(order()).toEqual(["BBB", "AAA", "CCC"]);
    fireEvent.click(header);
    expect(order()).toEqual(["CCC", "AAA", "BBB"]);
  });
});
