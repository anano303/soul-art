import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { formatPrice as formatNumber } from "@/lib/format-price";

export type Currency = "GEL" | "USD" | "EUR";

interface CurrencyFormat {
  symbol: string;
  code: Currency;
  format: (amount: number) => string;
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GEL: "₾",
  USD: "$",
  EUR: "€",
};

/**
 * Hook to get the user's currency based on their country
 * Returns currency code, symbol, and formatting function
 */
export function useCurrency() {
  // IMPORTANT: read the cookie only AFTER mount. Reading it during render makes
  // the server (no cookie → GEL) and client (cookie → USD/EUR) produce
  // different HTML, which causes React hydration errors. So we start at GEL on
  // both server and first client render, then update once mounted.
  const [userCurrency, setUserCurrency] = useState<Currency>("GEL");

  useEffect(() => {
    const currency = Cookies.get("user_currency") as Currency | undefined;
    if (currency === "USD" || currency === "EUR" || currency === "GEL") {
      setUserCurrency(currency);
    }
  }, []);

  const currencyFormat: CurrencyFormat = useMemo(() => {
    const symbol = CURRENCY_SYMBOLS[userCurrency];
    
    return {
      symbol,
      code: userCurrency,
      format: (amount: number) => {
        // Central formatter → thousand separators + trimmed trailing zeros.
        const formatted = formatNumber(amount);

        // USD puts symbol before, others after
        if (userCurrency === "USD") {
          return `${symbol}${formatted}`;
        }

        return `${formatted} ${symbol}`;
      },
    };
  }, [userCurrency]);

  /**
   * Get the appropriate price from convertedPrices object
   * Falls back to base GEL price if conversion not available
   */
  const getPrice = (
    basePrice: number,
    convertedPrices?: { USD?: number; EUR?: number; GEL?: number }
  ): number => {
    if (!convertedPrices) {
      return basePrice;
    }

    return convertedPrices[userCurrency] ?? basePrice;
  };

  /**
   * Format a price with the user's currency
   */
  const formatPrice = (
    basePrice: number,
    convertedPrices?: { USD?: number; EUR?: number; GEL?: number }
  ): string => {
    const price = getPrice(basePrice, convertedPrices);
    return currencyFormat.format(price);
  };

  return {
    currency: userCurrency,
    symbol: currencyFormat.symbol,
    format: currencyFormat.format,
    getPrice,
    formatPrice,
  };
}
