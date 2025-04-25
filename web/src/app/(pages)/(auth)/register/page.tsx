// import { AuthLayout } from '@/modules/auth/layouts/auth-layout';
// import { RegisterForm } from '@/modules/auth/components/register-form';

import { RegisterForm } from "@/modules/auth/components/register-form";
import { AuthLayout } from "@/modules/auth/layouts/auth-layout";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="მოგესალებით SoulArt-ის სამყაროში!"
      subtitle="გთხოვთ, შეავსოთ რეგისტრაციის ფორმა"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
