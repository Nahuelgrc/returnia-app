import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

vi.mock("@/hooks/useAssetSearch", () => ({
  useAssetSearch: () => ({ searchResults: [], isSearching: false }),
}));
vi.mock("@/hooks/useAssetPrice", () => ({
  useAssetPrice: () => {
    const [price, setPrice] = useState("");
    return { price, setPrice, isFetchingPrice: false };
  },
}));

import { AddTransactionModal } from "@/components/dashboard/AddTransactionModal";

const setup = (props: Partial<React.ComponentProps<typeof AddTransactionModal>> = {}) => {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(<AddTransactionModal isOpen onClose={onClose} onSubmit={onSubmit} {...props} />);
  return { onSubmit, onClose, user: userEvent.setup() };
};

describe("AddTransactionModal", () => {
  it("does not render when closed", () => {
    render(<AddTransactionModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText("Add Transaction")).not.toBeInTheDocument();
  });

  it("submits a buy with uppercase ticker and numeric values", async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByPlaceholderText("BTC"), "eth");
    await user.type(screen.getByPlaceholderText("0.00"), "1.5");
    await user.type(screen.getByPlaceholderText("$0.00"), "2000");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      type: "buy",
      assetType: "crypto",
      ticker: "ETH",
      quantity: 1.5,
      price: 2000,
    });
    expect(onSubmit.mock.calls[0][0].date).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  });

  it("allows switching to sell and to stocks", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: "Sell" }));
    await user.click(screen.getByRole("button", { name: "Stocks" }));
    await user.type(screen.getByPlaceholderText("AAPL"), "aapl");
    await user.type(screen.getByPlaceholderText("0.00"), "3");
    await user.type(screen.getByPlaceholderText("$0.00"), "150");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      type: "sell",
      assetType: "stock",
      ticker: "AAPL",
    });
  });

  it("limits the quantity to 8 decimals", async () => {
    const { user } = setup();
    const quantity = screen.getByPlaceholderText("0.00");
    await user.type(quantity, "0.123456789");
    expect(quantity).toHaveValue(0.12345678);
  });

  it("does not submit without required data", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the received error", () => {
    setup({ error: "You cannot sell 5 BTC on that date" });
    expect(screen.getByText(/You cannot sell 5 BTC/)).toBeInTheDocument();
  });

  it("prefills ticker, quantity and type when editing", () => {
    setup({ initialTicker: "AAPL", initialQuantity: "10", initialAssetType: "stock" });
    expect(screen.getByPlaceholderText("AAPL")).toHaveValue("AAPL");
    expect(screen.getByPlaceholderText("0.00")).toHaveValue(10);
  });

  it("Cancel closes the modal", async () => {
    const { onClose, user } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });
});
