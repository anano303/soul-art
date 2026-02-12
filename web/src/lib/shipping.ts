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

// Georgia domestic shipping: Tbilisi = 0₾, Region = 18₾
export function calculateDomesticShipping(city: string = ""): number {
  const cityLower = city.toLowerCase();
  const isTbilisi =
    cityLower.includes("tbilisi") || cityLower.includes("თბილისი");
  return isTbilisi ? 0 : 18;
}

export function calculateShipping(countryCode: string, city?: string): number {
  if (countryCode === "GE") {
    // For Georgia, use city-based calculation
    return calculateDomesticShipping(city || "");
  }
  const rate = getShippingRate(countryCode);
  return rate ? rate.cost : 0;
}

export function formatShippingCost(
  countryCode: string,
  showBothCurrencies: boolean = false,
): string {
  const rate = getShippingRate(countryCode);

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

export function isShippingSupported(countryCode: string): boolean {
  return shippingRates.some((rate) => rate.countryCode === countryCode);
}
