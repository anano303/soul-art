"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreateProductForm } from "@/modules/admin/components/create-product-form";

import { fetchWithAuth } from "@/lib/fetch-with-auth";

export default function EditProductPage() {
  const searchParams = useSearchParams();
  const id = searchParams ? searchParams.get("id") : null;
  const [product, setProduct] = useState(null);

  useEffect(() => {
    if (!id) return;

    fetchWithAuth(`/products/${id}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => setProduct(data))
      .catch((error) => console.error("Failed to fetch product", error));
  }, [id]);

  if (!product || Object.keys(product).length === 0) return <p>Loading...</p>;

  return (
    <div className="editProduct">
      <h1 style={{ textAlign: "center" }}> Update Product </h1>
      <CreateProductForm initialData={product} />
    </div>
  );
}
