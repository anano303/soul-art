/**
 * Central price formatting. Adds thousand separators and trims meaningless
 * trailing zeros: 213000.00 → "213,000", 12.9 → "12.90"? no — 12.9 → "12.90"
 * only when you ask for fixed decimals. By default: up to 2 decimals, no
 * padding (213000 → "213,000", 12.99 → "12.99", 12.5 → "12.5").
 *
 * Use this everywhere instead of `price.toFixed(2)`.
 */
export function formatPrice(
  amount: number | string | null | undefined,
  options?: { decimals?: number; locale?: string }
): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
  if (!Number.isFinite(n as number)) return "0";
  const decimals = options?.decimals;
  return new Intl.NumberFormat(options?.locale ?? "en-US", {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 2,
  }).format(n as number);
}

/**
 * Formatted price with a currency symbol (GEL ₾ suffix by default; USD/EUR
 * handled by callers that pass a symbol). Example: formatCurrency(213000) →
 * "213,000 ₾".
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  symbol: string = "₾",
  options?: { decimals?: number; prefix?: boolean }
): string {
  const value = formatPrice(amount, { decimals: options?.decimals });
  return options?.prefix ? `${symbol}${value}` : `${value} ${symbol}`;
}
