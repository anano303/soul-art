export interface ShippingRate {
  countryCode: string;
  countryName: string;
  cost: number; // in GEL
  costUSD: number; // in USD
  isFree: boolean;
}

// Exchange rate GEL to USD (1 USD = 2.5 GEL)
const GEL_TO_USD = 1 / 2.5;

export const shippingRates: ShippingRate[] = [
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

export function getShippingRate(countryCode: string): ShippingRate | null {
  return shippingRates.find((rate) => rate.countryCode === countryCode) || null;
}

// Find shipping rate by country name (e.g., "საქართველო", "Italy")
export function getShippingRateByName(countryName: string): ShippingRate | null {
  return shippingRates.find((rate) => rate.countryName === countryName) || null;
}

// Resolve country code from either code or name
function resolveCountryCode(countryCodeOrName: string): string {
  // If it's already a valid country code
  const byCode = shippingRates.find((rate) => rate.countryCode === countryCodeOrName);
  if (byCode) return byCode.countryCode;

  // Try matching by name
  const byName = shippingRates.find((rate) => rate.countryName === countryCodeOrName);
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
  return shippingRates.some((rate) => rate.countryCode === code);
}
