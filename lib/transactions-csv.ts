import {
  transactionSchema,
  type AssetType,
  type Side,
  type TransactionData,
} from "@/lib/schemas/transaction";

export const CSV_COLUMNS = [
  "date",
  "type",
  "assetType",
  "ticker",
  "quantity",
  "price",
  "comments",
] as const;

export const MAX_IMPORT_BYTES = 512 * 1024;
export const MAX_IMPORT_ROWS = 1000;

export interface ImportError {
  row: number;
  message: string;
}

export type ImportResult =
  | { error: string }
  | { errors: ImportError[] }
  | { success: true; imported: number };

export interface ExportableTransaction {
  executedAt: Date;
  side: Side;
  assetType: AssetType;
  tickerName: string;
  quantity: { toFixed(): string };
  price: { toFixed(): string };
  comments: string | null;
}

const DANGEROUS = /^'*[=+\-@\t\r]/;
const NEUTRALIZED = /^'+[=+\-@\t\r]/;

const neutralize = (value: string) => (DANGEROUS.test(value) ? `'${value}` : value);
const restore = (value: string) => (NEUTRALIZED.test(value) ? value.slice(1) : value);

const escapeCell = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export const transactionsToCsv = (transactions: ExportableTransaction[]) => {
  const lines = transactions.map((t) =>
    [
      t.executedAt.toISOString(),
      t.side,
      t.assetType,
      neutralize(t.tickerName),
      t.quantity.toFixed(),
      t.price.toFixed(),
      neutralize(t.comments ?? ""),
    ]
      .map(escapeCell)
      .join(","),
  );
  return [CSV_COLUMNS.join(","), ...lines].join("\r\n") + "\r\n";
};

export const parseCsv = (input: string): string[][] => {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const endRow = () => {
    row.push(cell);
    rows.push(row);
    row = [];
    cell = "";
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else cell += c;
  }

  if (quoted) throw new Error(`Unterminated quoted field in row ${rows.length + 1}`);
  if (cell !== "" || row.length > 0) endRow();
  return rows;
};

const toNumber = (value: string) =>
  /^\d*\.?\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;

export type ParseResult =
  | { error: string }
  | { errors: ImportError[] }
  | { transactions: TransactionData[] };

export const parseTransactionsCsv = (content: string): ParseResult => {
  let records: string[][];
  try {
    records = parseCsv(content);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid CSV" };
  }

  const [header, ...body] = records;
  if (!header) return { error: "The file is empty" };

  const index = Object.fromEntries(
    CSV_COLUMNS.map((name) => [
      name,
      header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase()),
    ]),
  ) as Record<(typeof CSV_COLUMNS)[number], number>;
  const missing = CSV_COLUMNS.filter((c) => c !== "comments" && index[c] < 0);
  if (missing.length > 0) return { error: `Missing columns: ${missing.join(", ")}` };

  const dataRows = body
    .map((cells, i) => ({ cells, row: i + 2 }))
    .filter(({ cells }) => !(cells.length === 1 && cells[0].trim() === ""));
  if (dataRows.length === 0) return { error: "The file has no transactions" };
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return { error: `Too many rows (max ${MAX_IMPORT_ROWS})` };
  }

  const errors: ImportError[] = [];
  const transactions: TransactionData[] = [];

  for (const { cells, row } of dataRows) {
    if (cells.length > header.length) {
      errors.push({ row, message: "More columns than the header" });
      continue;
    }
    const cell = (name: (typeof CSV_COLUMNS)[number]) =>
      index[name] < 0 ? "" : (cells[index[name]] ?? "");

    const date = cell("date").trim();
    if (!/^\d{4}-\d{2}-\d{2}/.test(date)) {
      errors.push({ row, message: "date: must be ISO 8601 (e.g. 2024-01-10T12:00:00Z)" });
      continue;
    }

    const parsed = transactionSchema.safeParse({
      type: cell("type").trim().toLowerCase(),
      assetType: cell("assetType").trim().toLowerCase(),
      ticker: restore(cell("ticker")),
      quantity: toNumber(cell("quantity")),
      price: toNumber(cell("price")),
      date,
      comments: restore(cell("comments")) || undefined,
    });
    if (!parsed.success) {
      errors.push({
        row,
        message: parsed.error.issues
          .map((i) => `${i.path.join(".") || "row"}: ${i.message}`)
          .join("; "),
      });
      continue;
    }
    transactions.push(parsed.data);
  }

  return errors.length > 0 ? { errors } : { transactions };
};
