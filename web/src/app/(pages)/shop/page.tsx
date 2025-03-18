import { ProductGrid } from "@/modules/products/components/product-grid";
import { getProducts } from "@/modules/products/api/get-products";
import { getVisiblePages } from "@/lib/utils";
import Link from "next/link";

interface HomePageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function home({ searchParams }: HomePageProps) {
  const { page } = await searchParams;
  const currentPage = Number(page) || 1;
  const { items: products, pages } = await getProducts(currentPage, 10);

  const visiblePages = getVisiblePages(currentPage, pages);

  return (
    <div className="container">
      <div className="content">
        <h1 className="title">Latest Products</h1>

        <ProductGrid products={products} />

        {/* პაგინაცია */}
        {pages > 1 && (
          <div className="pagination">
            <Link
              href={`/shop/?page=${currentPage - 1}`}
              className={`pagination-button ${
                currentPage === 1 ? "disabled" : ""
              }`}
            >
              Previous
            </Link>

            {visiblePages.map((pageNum, idx) =>
              pageNum === null ? (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                  ...
                </span>
              ) : (
                <Link
                  key={pageNum}
                  href={`/shop/?page=${pageNum}`}
                  className={`pagination-button ${
                    currentPage === pageNum ? "active" : ""
                  }`}
                >
                  {pageNum}
                </Link>
              )
            )}

            <Link
              href={`/shop/?page=${currentPage + 1}`}
              className={`pagination-button ${
                currentPage === pages ? "disabled" : ""
              }`}
            >
              Next
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
