import { CreateProductForm } from "@/modules/admin/components/create-product-form";

export default function CreateProductPage() {
  return (
    <div className="createProductPage">
      <div className="py-10 space-y-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">Create Product</h1>
        <CreateProductForm />
      </div>
    </div>
  );
}
