import { z } from "zod";

export const symbolSchema = z.string().regex(/^[A-Z0-9:.\-]{1,20}$/);

export const pricesBodySchema = z.object({
  symbols: z.array(symbolSchema).min(1).max(100),
});

export const searchParamsSchema = z.object({
  q: z.string().trim().min(1).max(50),
  type: z.enum(["crypto", "stock"]).optional(),
});
