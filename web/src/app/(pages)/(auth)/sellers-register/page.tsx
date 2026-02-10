"use client";

import { useRouter } from "next/navigation";
import { SellerRegistrationFlow } from "@/components/auth/SellerRegistrationFlow";
import styles from "./seller-register.module.css";

export default function SellerRegisterPage() {
  const router = useRouter();

  return (
    <div className={styles.sellerRegisterContainer}>
      <div id="seller-register-form" className={styles.formSection}>
        <SellerRegistrationFlow
          onComplete={() => router.push("/profile")}
          redirectTo="/profile"
          showLoginLink={true}
        />
      </div>
    </div>
  );
}
