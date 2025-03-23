"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types";
import { ProductsActions } from "./products-actions";
import { Sparkles, Plus } from "lucide-react";
import "./productList.css";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

export function ProductsList() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["products", page],
    queryFn: async () => {
      const response = await fetchWithAuth(`/products/user?page=${page}&limit=8`);
      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  const products = data?.items || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="prd-card">
      <div className="prd-header">
        <h1 className="prd-title">Products</h1>
        <div className="prd-actions">
          <Link href="/admin/products/create">
            <button className="prd-btn-outline">
              <Plus className="prd-icon" />
              Add Product
            </button>
          </Link>
          <Link href="/admin/products/ai">
            <button className="prd-btn">
              <Sparkles className="prd-icon" />
              Create Products with AI
            </button>
          </Link>
        </div>
      </div>
      <table className="prd-table">
        <thead>
          <tr className="prd-thead-row">
            <th className="prd-th">ID</th>
            <th className="prd-th">IMAGE</th>
            <th className="prd-th">NAME</th>
            <th className="prd-th">PRICE</th>
            <th className="prd-th">CATEGORY</th>
            <th className="prd-th">STOCK</th>
            <th className="prd-th prd-th-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product: Product) => (
            <tr key={product._id} className="prd-tr">
              <td className="prd-td prd-td-bold">
                {" "}
                #{product._id ? product._id : "No ID"}
              </td>
              <td className="prd-td">
                <div className="prd-img-wrapper">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="prd-img"
                  />
                </div>
              </td>
              <td className="prd-td">{product.name}</td>
              <td className="prd-td">${product.price}</td>
              <td className="prd-td">{product.category}</td>
              <td className="prd-td">{product.countInStock}</td>
              <td className="prd-td prd-td-right">
                <ProductsActions product={product} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          className="pagination-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="pagination-info">
          Page {page} of {totalPages}
        </span>
        <button
          className="pagination-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
