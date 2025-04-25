import { ForgotPasswordForm } from "@/modules/auth/components/forgot-password";
import { AuthLayout } from "@/modules/auth/layouts/auth-layout";

export default function LoginPage() {
  return (
    <AuthLayout
      title="განაახლეთ პაროლი"
      subtitle="გთხოვთ, შეავსოთ პაროლის აღდგენის ფორმა"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
