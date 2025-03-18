import "./ProductCardSkeleton.css";

export function ProductCardSkeleton() {
  return (
    <div className="product-card">
      <div className="product-image">
        <div className="skeleton square"></div>
      </div>
      <div className="product-details">
        <div className="skeleton text-large"></div>
        <div className="skeleton text-medium"></div>
        <div className="skeleton text-small"></div>
      </div>
    </div>
  );
}
