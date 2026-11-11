import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  MAX_IMPORT_ROWS,
  parseCsv,
  parseTransactionsCsv,
  transactionsToCsv,
  type ExportableTransaction,
} from "@/lib/transactions-csv";

const HEADER = "date,type,assetType,ticker,quantity,price,comments";

const record = (overrides: Partial<ExportableTransaction> = {}): ExportableTransaction => ({
  executedAt: new Date("2024-01-10T12:00:00.000Z"),
  side: "buy",
  assetType: "crypto",
  tickerName: "BTC",
  quantity: new Prisma.Decimal("0.5"),
  price: new Prisma.Decimal("42000"),
  comments: null,
  ...overrides,
});

describe("parseCsv", () => {
  it("parses simple rows with LF and CRLF", () => {
    expect(parseCsv("a,b\nc,d")).toEqual([["a", "b"], ["c", "d"]]);
    expect(parseCsv("a,b\r\nc,d\r\n")).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("supports quotes, escaped quotes, commas and newlines inside quotes", () => {
    expect(parseCsv('"a,b","say ""hi""","l1\r\nl2"\n')).toEqual([
      ["a,b", 'say "hi"', "l1\r\nl2"],
    ]);
  });

  it("strips the BOM", () => {
    expect(parseCsv("﻿a,b\n")).toEqual([["a", "b"]]);
  });

  it("keeps empty cells", () => {
    expect(parseCsv("a,,c\n,")).toEqual([["a", "", "c"], ["", ""]]);
    expect(parseCsv('"",x')).toEqual([["", "x"]]);
  });

  it("throws on an unterminated quote", () => {
    expect(() => parseCsv('a,"b\nc')).toThrow("Unterminated");
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("transactionsToCsv", () => {
  it("writes header, ISO date and plain decimals with CRLF", () => {
    expect(transactionsToCsv([record()])).toBe(
      `${HEADER}\r\n2024-01-10T12:00:00.000Z,buy,crypto,BTC,0.5,42000,\r\n`,
    );
  });

  it("does not use exponent notation", () => {
    const csv = transactionsToCsv([
      record({ quantity: new Prisma.Decimal("0.00000001"), price: new Prisma.Decimal("1e21") }),
    ]);
    expect(csv).toContain(",0.00000001,1000000000000000000000,");
  });

  it("escapes quotes, commas and newlines in comments", () => {
    const csv = transactionsToCsv([record({ comments: 'a "b", c\nd' })]);
    expect(csv).toContain(',"a ""b"", c\nd"\r\n');
  });

  it.each(["=SUM(A1)", "+1", "-1", "@cmd", "\tx", "\rx"])(
    "neutralizes formula injection in comments: %j",
    (comments) => {
      const [, line] = parseCsv(transactionsToCsv([record({ comments })]));
      expect(line[6]).toBe(`'${comments}`);
    },
  );

  it("neutralizes formula injection in the ticker", () => {
    const [, line] = parseCsv(transactionsToCsv([record({ tickerName: "-X" })]));
    expect(line[3]).toBe("'-X");
  });

  it("does not touch harmless text", () => {
    const [, line] = parseCsv(transactionsToCsv([record({ comments: "'hello" })]));
    expect(line[6]).toBe("'hello");
  });
});

describe("parseTransactionsCsv", () => {
  it("parses a valid file", () => {
    const result = parseTransactionsCsv(
      `﻿${HEADER}\r\n2024-01-10T12:00:00Z,BUY,Crypto, btc ,0.5,42000,"hi, there"\r\n`,
    );
    expect(result).toEqual({
      transactions: [
        {
          type: "buy",
          assetType: "crypto",
          ticker: "BTC",
          quantity: 0.5,
          price: 42000,
          date: new Date("2024-01-10T12:00:00Z"),
          comments: "hi, there",
        },
      ],
    });
  });

  it("accepts columns in any order and without comments", () => {
    const result = parseTransactionsCsv(
      "ticker,price,quantity,date,assetType,type\nAAPL,150,3,2024-01-10,stock,sell\n",
    );
    expect(result).toMatchObject({ transactions: [{ ticker: "AAPL", type: "sell" }] });
  });

  it("skips blank lines but keeps physical row numbers", () => {
    const result = parseTransactionsCsv(
      `${HEADER}\n\n2024-01-10,buy,crypto,BTC,1,100,\n2024-01-11,buy,crypto,BTC,-1,100,\n`,
    );
    expect(result).toEqual({
      errors: [{ row: 4, message: expect.stringContaining("quantity") }],
    });
  });

  it("collects errors with row number and reason without partial results", () => {
    const result = parseTransactionsCsv(
      [
        HEADER,
        "2024-01-10,buy,crypto,BTC,1,100,",
        "nope,buy,crypto,BTC,1,100,",
        "2024-01-10,hold,crypto,BTC,1,100,",
        "2024-01-10,buy,crypto,B T C,1,100,",
        "2024-01-10,buy,crypto,BTC,abc,100,",
        "2099-01-10,buy,crypto,BTC,1,100,",
        "2024-01-10,buy,crypto,BTC,1,100,,extra",
      ].join("\n"),
    );
    expect(result).toMatchObject({
      errors: [
        { row: 3, message: expect.stringContaining("ISO 8601") },
        { row: 4, message: expect.stringContaining("type") },
        { row: 5, message: expect.stringContaining("ticker") },
        { row: 6, message: expect.stringContaining("quantity") },
        { row: 7, message: "date: The date cannot be in the future" },
        { row: 8, message: "More columns than the header" },
      ],
    });
  });

  it("rejects missing columns, empty files and files without rows", () => {
    expect(parseTransactionsCsv("date,type\n1,2")).toEqual({
      error: "Missing columns: assetType, ticker, quantity, price",
    });
    expect(parseTransactionsCsv("")).toEqual({ error: "The file is empty" });
    expect(parseTransactionsCsv(`${HEADER}\n`)).toEqual({
      error: "The file has no transactions",
    });
  });

  it("rejects unterminated quotes", () => {
    expect(parseTransactionsCsv(`${HEADER}\n2024-01-10,buy,crypto,BTC,1,100,"x`)).toEqual({
      error: "Unterminated quoted field in row 2",
    });
  });

  it("enforces the row limit", () => {
    const row = "2024-01-10,buy,crypto,BTC,1,100,";
    const ok = [HEADER, ...Array(MAX_IMPORT_ROWS).fill(row)].join("\n");
    expect(parseTransactionsCsv(ok)).toHaveProperty("transactions");
    const tooMany = [HEADER, ...Array(MAX_IMPORT_ROWS + 1).fill(row)].join("\n");
    expect(parseTransactionsCsv(tooMany)).toEqual({
      error: `Too many rows (max ${MAX_IMPORT_ROWS})`,
    });
  });

  it("round-trips export to import, including dangerous text", () => {
    const originals = [
      record(),
      record({
        executedAt: new Date("2024-02-01T09:30:00.000Z"),
        side: "sell",
        assetType: "stock",
        tickerName: "AAPL",
        quantity: new Prisma.Decimal("0.25"),
        price: new Prisma.Decimal("150.25"),
        comments: 'multi\nline, "quoted"',
      }),
      record({ tickerName: "-X", comments: "=1+1" }),
      record({ comments: "'=already" }),
      record({ comments: "'plain" }),
    ];
    const result = parseTransactionsCsv(transactionsToCsv(originals));
    expect(result).toHaveProperty("transactions");
    const { transactions } = result as { transactions: unknown[] };
    expect(transactions).toEqual(
      originals.map((o) => ({
        type: o.side,
        assetType: o.assetType,
        ticker: o.tickerName,
        quantity: Number(o.quantity.toFixed()),
        price: Number(o.price.toFixed()),
        date: o.executedAt,
        comments: o.comments ?? undefined,
      })),
    );
  });
});
