export interface ShippingRate {
  countryCode: string;
  countryName: string;
  cost: number; // in GEL
  costUSD: number; // in USD
  isFree: boolean;
}

// Exchange rate GEL to USD (1 GEL = 1/2.8 USD)
const GEL_TO_USD = 1 / 2.8;

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

export function calculateShipping(countryCode: string): number {
  const rate = getShippingRate(countryCode);
  return rate ? rate.cost : 0;
}

export function formatShippingCost(
  countryCode: string,
  showBothCurrencies: boolean = false
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
