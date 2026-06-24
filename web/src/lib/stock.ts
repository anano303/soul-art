// Single source of truth for product stock / availability.
//
// Mirrors the Buy-Now button logic in product-details.tsx:
//   - If the product has variants, purchasable stock lives on the variants
//     (a variant product with countInStock > 0 but all variants at 0 is NOT
//     buyable, so it must read as out of stock).
//   - Otherwise stock is the product-level count.
//
// Used by metadata (product:availability), JSON-LD (schema.org availability),
// and anywhere else that needs to agree with the buy button.

type StockVariant = { stock?: number | null };

type StockLike = {
  countInStock?: number | null;
  stockQuantity?: number | null;
  variants?: StockVariant[] | null;
};

export function getTotalStock(product?: StockLike | null): number {
  if (!product) return 0;

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.reduce((sum, v) => sum + (v?.stock ?? 0), 0);
  }

  return product.countInStock ?? product.stockQuantity ?? 0;
}

export function isInStock(product?: StockLike | null): boolean {
  return getTotalStock(product) > 0;
}
