export interface ShippingRate {
  countryCode: string;
  countryName: string;
  cost: number; // in GEL
  costUSD: number; // in USD
  isFree: boolean;
}

// Exchange rate GEL to USD (1 USD = 2.5 GEL) - used for fallback calculations
const GEL_TO_USD = 1 / 2.5;

// Module-level cache for shipping rates fetched from API
let cachedShippingRates: ShippingRate[] | null = null;

// Hardcoded fallback rates (used if API hasn't been called yet or fails)
const fallbackShippingRates: ShippingRate[] = [
  {
    countryCode: "GE",
    countryName: "საქართველო",
    cost: 0,
    costUSD: 0,
    isFree: true,
  },
  {
    countryCode: "IT",
    countryName: "Italy",
    cost: 200,
    costUSD: Math.round(200 * GEL_TO_USD),
    isFree: false,
  },
  {
    countryCode: "DE",
    countryName: "Germany",
    cost: 200,
    costUSD: Math.round(200 * GEL_TO_USD),
    isFree: false,
  },
  {
    countryCode: "FR",
    countryName: "France",
    cost: 200,
    costUSD: Math.round(200 * GEL_TO_USD),
    isFree: false,
  },
  {
    countryCode: "ES",
    countryName: "Spain",
    cost: 200,
    costUSD: Math.round(200 * GEL_TO_USD),
    isFree: false,
  },
  {
    countryCode: "US",
    countryName: "United States",
    cost: 300,
    costUSD: Math.round(300 * GEL_TO_USD),
    isFree: false,
  },
];

// Get current shipping rates (cached or fallback)
export function getShippingRates(): ShippingRate[] {
  return cachedShippingRates || fallbackShippingRates;
}

// Fetch shipping rates from API and cache them
export async function fetchShippingRates(): Promise<ShippingRate[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shipping-countries`);
    if (res.ok) {
      const countries = await res.json();
      // Transform API response to ShippingRate format
      const rates = countries.map((c: any) => ({
        countryCode: c.countryCode,
        countryName: c.countryName,
        cost: c.cost,
        costUSD: Math.round(c.cost * GEL_TO_USD),
        isFree: c.isFree,
      }));
      cachedShippingRates = rates;
      return rates;
    }
  } catch (error) {
    console.error("Error fetching shipping rates:", error);
  }
  // Return fallback if fetch fails
  return fallbackShippingRates;
}

// Manually set shipping rates (useful for SSR or custom sources)
export function setShippingRates(rates: ShippingRate[]): void {
  cachedShippingRates = rates;
}

export const shippingRates: ShippingRate[] = fallbackShippingRates;

export function getShippingRate(countryCode: string): ShippingRate | null {
  const rates = getShippingRates();
  return rates.find((rate) => rate.countryCode === countryCode) || null;
}

// Find shipping rate by country name (e.g., "საქართველო", "Italy")
export function getShippingRateByName(countryName: string): ShippingRate | null {
  const rates = getShippingRates();
  return rates.find((rate) => rate.countryName === countryName) || null;
}

// Resolve country code from either code or name
function resolveCountryCode(countryCodeOrName: string): string {
  const rates = getShippingRates();
  
  // If it's already a valid country code
  const byCode = rates.find((rate) => rate.countryCode === countryCodeOrName);
  if (byCode) return byCode.countryCode;

  // Try matching by name
  const byName = rates.find((rate) => rate.countryName === countryCodeOrName);
  if (byName) return byName.countryCode;

  // Handle common aliases
  const aliases: Record<string, string> = {
    "Georgia": "GE",
    "georgia": "GE",
    "საქართველო": "GE",
    "Italy": "IT",
    "italy": "IT",
    "Germany": "DE",
    "germany": "DE",
    "France": "FR",
    "france": "FR",
    "Spain": "ES",
    "spain": "ES",
    "United States": "US",
    "united states": "US",
    "USA": "US",
  };

  return aliases[countryCodeOrName] || countryCodeOrName;
}

// Georgia domestic shipping: Tbilisi = 0₾, Region = 18₾
export function calculateDomesticShipping(city: string = ""): number {
  const cityLower = city.toLowerCase();
  const isTbilisi =
    cityLower.includes("tbilisi") || cityLower.includes("თბილისი");
  return isTbilisi ? 0 : 18;
}

export function calculateShipping(countryCodeOrName: string, city?: string): number {
  const code = resolveCountryCode(countryCodeOrName);
  if (code === "GE") {
    // For Georgia, use city-based calculation
    return calculateDomesticShipping(city || "");
  }
  const rate = getShippingRate(code);
  return rate ? rate.cost : 0;
}

export function formatShippingCost(
  countryCodeOrName: string,
  showBothCurrencies: boolean = false,
): string {
  const code = resolveCountryCode(countryCodeOrName);
  const rate = getShippingRate(code);

  if (!rate) {
    return "0 ₾";
  }

  if (rate.isFree) {
    return "უფასო";
  }

  if (showBothCurrencies) {
    return `${rate.cost} ₾ ($${rate.costUSD})`;
  }

  return `${rate.cost} ₾`;
}

export function isShippingSupported(countryCodeOrName: string): boolean {
  const code = resolveCountryCode(countryCodeOrName);
  const rates = getShippingRates();
  return rates.some((rate) => rate.countryCode === code);
}
