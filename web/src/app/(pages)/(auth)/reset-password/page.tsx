import { Suspense } from "react";
import { ResetPasswordForm } from "@/modules/auth/components/reset-password";
import { AuthLayout } from "@/modules/auth/layouts/auth-layout";

export default function LoginPage() {
  return (
    <AuthLayout
      title="პაროლის აღდგენა"
      subtitle="გთხოვთ, შეავსოთ პაროლის აღდგენის ფორმა"
    >
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}

