import { notFound } from "next/navigation";
import { ProductDetails } from "@/modules/products/components/product-details";
import ProductPromoToast from "./ProductPromoToast";
import { getProduct } from "@/lib/get-product";

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
