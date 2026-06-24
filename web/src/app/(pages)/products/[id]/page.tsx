import { notFound } from "next/navigation";
import { ProductDetails } from "@/modules/products/components/product-details";
import ProductPromoToast from "./ProductPromoToast";

// Server-side fetch so product title/price/description ship in the initial HTML.
async function getProduct(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products/${id}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  // Proper HTTP 404 for missing/deleted products (avoids soft-404 in Google).
  if (!product || !product._id) {
    notFound();
  }

  return (
    <div className="Container">
      <ProductPromoToast id={id} />
      <ProductDetails product={product} />
    </div>
  );
}
