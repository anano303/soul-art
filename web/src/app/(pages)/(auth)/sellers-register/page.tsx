import { AuthLayout } from "@/modules/auth/layouts/auth-layout";
import { SellerRegisterForm } from "@/modules/auth/components/seller-register-form";

export default function SellerRegisterPage() {
  return (
    <AuthLayout
      title="Seller Registration"
      subtitle="Register your store and start selling on SoulArt!"
    >
      <SellerRegisterForm />
    </AuthLayout>
  );
}
