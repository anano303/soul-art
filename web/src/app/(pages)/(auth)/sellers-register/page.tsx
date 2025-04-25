import { AuthLayout } from "@/modules/auth/layouts/auth-layout";
import { SellerRegisterForm } from "@/modules/auth/components/seller-register-form";
import SellerBenefits from "@/components/sellerBenefits/sellerBenefits";
import styles from './seller-register.module.css';

export default function SellerRegisterPage() {
  return (
    <div className={styles.sellerRegisterContainer}>
      <div className={styles.benefitsSection}>
        <SellerBenefits/>
      </div>
      <div className={styles.formSection}>
        <AuthLayout
          title="მოგესალებით SoulArt-ის სამყაროში!"
          subtitle="შექმენით თქვენი პორტფოლიო და დაიწყეთ გაყიდვები!"
        >
          <SellerRegisterForm />
        </AuthLayout>
      </div>
    </div>
  );
}
