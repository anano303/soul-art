// Test the aggregation logic
const testData = [
  { _id: null, count: 259 },
  { _id: 'all', count: 1 },
  { _id: 'none', count: 1 },
];

const consentCounts = {};
testData.forEach(({ _id, count }) => {
  // Handle null, undefined, and missing values - treat them all as 'none'
  const key = _id === null || _id === undefined ? 'none' : String(_id);
  // Add to existing count (in case both null and 'none' exist)
  consentCounts[key] = (consentCounts[key] || 0) + count;
});

console.log('consentCounts:', consentCounts);

const campaignConsentStats = {
  sellersWithAllProducts: consentCounts['all'] || 0,
  sellersWithPerProduct: consentCounts['per_product'] || 0,
  sellersWithNone: consentCounts['none'] || 0,
  totalProductsWithReferral: 4,
};

console.log('campaignConsentStats:', campaignConsentStats);
