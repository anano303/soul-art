import { useMemo } from "react";
import Cookies from "js-cookie";

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
  const userCurrency = useMemo(() => {
    // Get currency from cookie (set by middleware based on geo-detection)
    const currency = Cookies.get("user_currency") as Currency | undefined;
    
    // Default to GEL if not set
    return currency || "GEL";
  }, []);

  const currencyFormat: CurrencyFormat = useMemo(() => {
    const symbol = CURRENCY_SYMBOLS[userCurrency];
    
    return {
      symbol,
      code: userCurrency,
      format: (amount: number) => {
        const formatted = amount.toFixed(2);
        
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
