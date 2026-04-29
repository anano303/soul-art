"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CreateProductForm } from "@/modules/admin/components/create-product-form";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import HeartLoading from "@/components/HeartLoading/HeartLoading";

function CreateProductContent() {
  const searchParams = useSearchParams();
  const duplicateId = searchParams ? searchParams.get("duplicate") : null;
  const [duplicateData, setDuplicateData] = useState<any>(undefined);
  const [loading, setLoading] = useState(!!duplicateId);

  useEffect(() => {
    if (!duplicateId) return;

    fetchWithAuth(`/products/${duplicateId}`, { method: "GET" })
      .then((res) => res.json())
      .then((data) => {
        // Remove fields that shouldn't be copied
        const { _id, id, slug, createdAt, updatedAt, status, rating, numReviews, ...rest } = data;
        setDuplicateData({
          ...rest,
          name: `${rest.name} (ასლი)`,
          nameEn: rest.nameEn ? `${rest.nameEn} (copy)` : undefined,
        });
      })
      .catch((error) => {
        console.error("Failed to fetch product for duplication", error);
      })
      .finally(() => setLoading(false));
  }, [duplicateId]);

  if (loading) return <HeartLoading size="medium" />;

  return (
    <div className="createProductPage">
      <div className="py-10 space-y-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">
          {duplicateData ? "დააკოპირე პროდუქტი" : "Create Product"}
        </h1>
        <CreateProductForm initialData={duplicateData} />
      </div>
    </div>
  );
}

export default function CreateProductPage() {
  return (
    <Suspense fallback={<HeartLoading size="medium" />}>
      <CreateProductContent />
    </Suspense>
  );
}
