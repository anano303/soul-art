// import { AuthLayout } from '@/modules/auth/layouts/auth-layout';
// import { RegisterForm } from '@/modules/auth/components/register-form';

import { RegisterForm } from "@/modules/auth/components/register-form";
import { AuthLayout } from "@/modules/auth/layouts/auth-layout";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Welcome to SoulArt!"
      subtitle="Enter your details to get started."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
