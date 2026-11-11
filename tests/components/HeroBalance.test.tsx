import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroBalance } from "@/components/dashboard/HeroBalance";

describe("HeroBalance", () => {
  it("shows a positive realized P&L in green", () => {
    render(<HeroBalance total={1000} invested={900} realizedPnl={1234.5} />);
    expect(screen.getByText("Realized P&L")).toBeInTheDocument();
    expect(screen.getByTestId("realized-pnl")).toHaveTextContent("+$1,234.50");
    expect(screen.getByTestId("realized-pnl")).toHaveClass("text-success");
  });

  it("shows a negative realized P&L in red", () => {
    render(<HeroBalance total={1000} invested={900} realizedPnl={-80} />);
    expect(screen.getByTestId("realized-pnl")).toHaveTextContent("-$80.00");
    expect(screen.getByTestId("realized-pnl")).toHaveClass("text-danger");
  });

  it("shows zero without sign", () => {
    render(<HeroBalance total={0} invested={0} realizedPnl={0} />);
    expect(screen.getByTestId("realized-pnl")).toHaveTextContent("$0.00");
    expect(screen.getByTestId("realized-pnl")).toHaveClass("text-success");
  });
});
