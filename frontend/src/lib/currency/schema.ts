import { z } from 'zod';

/**
 * Zod schema for validating raw currency data from API
 */
export const RawCurrencySchema = z.object({
  code: z.string().min(3).max(3).regex(/^[A-Z]{3}$/, 'Currency code must be 3 uppercase letters'),
  name: z.string().min(1, 'Currency name is required'),
  symbol: z.string().optional(),
});

/**
 * Zod schema for validating processed currency data
 */
export const CurrencySchema = z.object({
  code: z.string().min(3).max(3).regex(/^[A-Z]{3}$/, 'Currency code must be 3 uppercase letters'),
  name: z.string().min(1, 'Currency name is required'),
  symbol: z.string().optional(),
});

/**
 * Zod schema for validating array of raw currency data
 */
export const RawCurrencyArraySchema = z.array(RawCurrencySchema);

/**
 * Zod schema for validating array of processed currency data
 */
export const CurrencyArraySchema = z.array(CurrencySchema);

/**
 * Zod schema for validating currency cache entry
 */
export const CurrencyCacheEntrySchema = z.object({
  data: CurrencyArraySchema,
  timestamp: z.number(),
  ttl: z.number(),
});

/**
 * Type inference helpers
 */
export type RawCurrencyData = z.infer<typeof RawCurrencySchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type CurrencyCacheEntry = z.infer<typeof CurrencyCacheEntrySchema>;