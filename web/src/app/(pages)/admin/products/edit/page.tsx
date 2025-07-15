"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreateProductForm } from "@/modules/admin/components/create-product-form";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useQueryClient } from "@tanstack/react-query";
import HeartLoading from "@/components/HeartLoading/HeartLoading";

export default function EditProductPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const handleUpdateSuccess = () => {
    // Invalidate the queries to force a refresh when returning to products list
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["pendingProducts"] });

    // Set a flag in sessionStorage to indicate we're returning from edit
    sessionStorage.setItem("returnFromEdit", "true");

    // Navigate back to products list
    router.push("/admin/products");
  };

  if (!product || Object.keys(product).length === 0) return <HeartLoading size="medium" />;

  return (
    <div className="editProduct">
      <h1 style={{ textAlign: "center" }}> Update Product </h1>
      <CreateProductForm
        initialData={product}
        onSuccess={handleUpdateSuccess}
        isEdit={true}
      />
    </div>
  );
}
