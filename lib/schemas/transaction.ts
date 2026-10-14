import { z } from "zod";

export const assetTypeSchema = z.enum(["crypto", "stock"]);
export const sideSchema = z.enum(["buy", "sell"]);

export const tickerSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.\-]{1,20}$/);

export const transactionSchema = z.object({
  type: sideSchema,
  assetType: assetTypeSchema,
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9.\-]{1,20}$/),
  quantity: z.number().positive().max(1e15),
  price: z.number().positive().max(1e12),
  date: z.coerce
    .date()
    .refine((d) => d.getTime() <= Date.now() + 24 * 60 * 60 * 1000, {
      message: "The date cannot be in the future",
    })
    .refine((d) => d.getFullYear() >= 2000, {
      message: "The date is not valid",
    }),
  comments: z.string().trim().max(500).optional(),
});

export type AssetType = z.infer<typeof assetTypeSchema>;
export type Side = z.infer<typeof sideSchema>;
export type TransactionData = z.infer<typeof transactionSchema>;
export type TransactionPayload = Omit<TransactionData, "date"> & { date: string };
