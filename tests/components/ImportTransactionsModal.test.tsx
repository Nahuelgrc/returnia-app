import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportTransactionsModal } from "@/components/dashboard/ImportTransactionsModal";
import { MAX_IMPORT_BYTES } from "@/lib/transactions-csv";

const csvFile = (content = "a,b", name = "t.csv") =>
  new File([content], name, { type: "text/csv" });

const setup = (onImport = vi.fn()) => {
  const onClose = vi.fn();
  render(<ImportTransactionsModal isOpen onClose={onClose} onImport={onImport} />);
  return { onImport, onClose, user: userEvent.setup() };
};

describe("ImportTransactionsModal", () => {
  it("does not render when closed", () => {
    render(<ImportTransactionsModal isOpen={false} onClose={vi.fn()} onImport={vi.fn()} />);
    expect(screen.queryByText("Import Transactions")).not.toBeInTheDocument();
  });

  it("shows the expected format and an example", () => {
    setup();
    expect(screen.getByText(/assetType, ticker, quantity, price/)).toBeInTheDocument();
    expect(screen.getByText(/First buy/)).toBeInTheDocument();
  });

  it("keeps Import disabled until a file is chosen", async () => {
    const { user } = setup();
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
    await user.upload(screen.getByLabelText("CSV file"), csvFile());
    expect(screen.getByRole("button", { name: "Import" })).toBeEnabled();
  });

  it("sends the file content and shows the imported summary", async () => {
    const onImport = vi.fn().mockResolvedValue({ success: true, imported: 3 });
    const { user } = setup(onImport);
    await user.upload(screen.getByLabelText("CSV file"), csvFile("hello,world"));
    await user.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(onImport).toHaveBeenCalledWith("hello,world"));
    expect(await screen.findByText("3 transactions imported.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("lists row errors", async () => {
    const onImport = vi.fn().mockResolvedValue({
      errors: [
        { row: 2, message: "quantity: too small" },
        { row: 5, message: "type: invalid" },
      ],
    });
    const { user } = setup(onImport);
    await user.upload(screen.getByLabelText("CSV file"), csvFile());
    await user.click(screen.getByRole("button", { name: "Import" }));
    expect(await screen.findByText("Row 2: quantity: too small")).toBeInTheDocument();
    expect(screen.getByText("Row 5: type: invalid")).toBeInTheDocument();
    expect(screen.getByText(/Nothing was imported/)).toBeInTheDocument();
  });

  it("shows a general error", async () => {
    const onImport = vi.fn().mockResolvedValue({ error: "Unauthorized" });
    const { user } = setup(onImport);
    await user.upload(screen.getByLabelText("CSV file"), csvFile());
    await user.click(screen.getByRole("button", { name: "Import" }));
    expect(await screen.findByText("Unauthorized")).toBeInTheDocument();
  });

  it("rejects files over the size limit without calling onImport", async () => {
    const { onImport, user } = setup();
    await user.upload(
      screen.getByLabelText("CSV file"),
      csvFile("x".repeat(MAX_IMPORT_BYTES + 1)),
    );
    expect(screen.getByText(/too large/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it("closes through Cancel", async () => {
    const { onClose, user } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });
});
