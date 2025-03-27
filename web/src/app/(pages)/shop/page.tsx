'use client';

import { Suspense, useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { ProductGrid } from '@/modules/products/components/product-grid';
import { getProducts } from '@/modules/products/api/get-products';
import { Product } from '@/types';

function ShopContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const searchParams = useSearchParams();
  const brand = searchParams ? searchParams.get('brand') : null;

  const { data, isLoading } = useInfiniteQuery({
    queryKey: ['products', brand],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getProducts(pageParam, 10, undefined, brand || undefined);
      return response;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pages > lastPage.page ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  useEffect(() => {
    if (data) {
      const allProducts = data.pages.flatMap((page) => page.items);
      setProducts(allProducts);
    }
  }, [data]);

  if (isLoading) return <div>იტვირთება...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">
        {brand ? `${brand}-ის ნამუშევრები` : 'ყველა ნამუშევარი'}
      </h1>
      <ProductGrid products={products} />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ShopContent />
    </Suspense>
  );
}