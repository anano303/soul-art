"use client";

import { useEffect, useState, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { getProducts } from "@/modules/products/api/get-products";
import { Product } from "@/types";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const loader = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["products"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getProducts(pageParam, 10);
      return response;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.pages > allPages.length ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  useEffect(() => {
    if (data) {
      const allProducts = data.pages.flatMap((page) => page.items);
      setProducts(allProducts);
    }
  }, [data]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage().then(() => {
            const nextPage = data?.pages ? data.pages.length + 1 : 1;
            window.history.pushState(null, '', `/shop/?page=${nextPage}`);
          });
        }
      },
      { threshold: 1.0 }
    );

    if (loader.current) {
      observer.observe(loader.current);
    }

    return () => {
      if (loader.current) {
        observer.unobserve(loader.current);
      }
    };
  }, [hasNextPage, fetchNextPage, data]);

  if (isLoading && !data) return <div>იტვირთება...</div>;

  return (
    <div className="container">
      <div className="content">
        <h1 className="title"> ნამუშევრები </h1>

        <ProductGrid products={products} />

        <div ref={loader} className="loading">
          {isFetchingNextPage && <div>იტვირთება მეტი...</div>}
        </div>
      </div>
    </div>
  );
}