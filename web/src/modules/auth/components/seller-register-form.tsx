"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sellerRegisterSchema } from "../validation/seller-register-schema";
import { useSellerRegister } from "../hooks/use-auth";
import Link from "next/link";
import "./register-form.css";
import type * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

type SellerRegisterFormData = z.infer<typeof sellerRegisterSchema>;

export function SellerRegisterForm() {
  const router = useRouter();
  const { mutate: register, isPending } = useSellerRegister();
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<SellerRegisterFormData>({
    resolver: zodResolver(sellerRegisterSchema),
  });

  const onSubmit = handleSubmit((data) => {
    setRegistrationError(null);
    
    register(data, {
      onSuccess: () => {
        setIsSuccess(true);
        toast({
          title: "რეგისტრაცია წარმატებულია",
          description: "თქვენი გამყიდველის ანგარიში წარმატებით შეიქმნა",
          variant: "default",
        });
        
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      },
      onError: (error) => {
        // Display the error message directly from the backend
        const errorMessage = error.message;
        setRegistrationError(errorMessage);
        
        toast({
          title: "რეგისტრაცია ვერ მოხერხდა",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  });

  if (isSuccess) {
    return (
      <div className="form-container">
        <div className="success-message">
          <h3>რეგისტრაცია წარმატებულია!</h3>
          <p>თქვენი გამყიდველის ანგარიში წარმატებით შეიქმნა.</p>
          <p>გადამისამართება ავტორიზაციის გვერდზე...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <form onSubmit={onSubmit} className="form">
        <div className="input-group">
          <label htmlFor="storeName">მხატვრის/კომპანიის სახელი</label>
          <input
            id="storeName"
            type="text"
            placeholder="მხატვრის/კომპანიის სახელი"
            {...registerField("storeName")}
          />
          {errors.storeName && (
            <p className="error-text">{errors.storeName.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="storeLogo"> ლოგო (არასავალდებულო)</label>
          <input
            id="storeLogo"
            type="text"
            placeholder="ლოგოს URL"
            {...registerField("storeLogo")}
          />
          {errors.storeLogo && (
            <p className="error-text">{errors.storeLogo.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="ownerFirstName">მფლობელის სახელი</label>
          <input
            id="ownerFirstName"
            type="text"
            placeholder="სახელი"
            {...registerField("ownerFirstName")}
          />
          {errors.ownerFirstName && (
            <p className="error-text">{errors.ownerFirstName.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="ownerLastName">მფლობელის გვარი</label>
          <input
            id="ownerLastName"
            type="text"
            placeholder="გვარი"
            {...registerField("ownerLastName")}
          />
          {errors.ownerLastName && (
            <p className="error-text">{errors.ownerLastName.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="phoneNumber">ტელეფონის ნომერი</label>
          <input
            id="phoneNumber"
            type="tel"
            placeholder="+995555123456"
            {...registerField("phoneNumber")}
          />
          {errors.phoneNumber && (
            <p className="error-text">{errors.phoneNumber.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="email">ელ-ფოსტა</label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...registerField("email")}
          />
          {errors.email && <p className="error-text">{errors.email.message}</p>}
        </div>

        <div className="input-group">
          <label htmlFor="password">პაროლი</label>
          <input
            id="password"
            type="password"
            placeholder="********"
            {...registerField("password")}
          />
          {errors.password && (
            <p className="error-text">{errors.password.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="identificationNumber">პირადი ნომერი</label>
          <input
            id="identificationNumber"
            type="text"
            placeholder="11-ნიშნა პირადი ნომერი"
            {...registerField("identificationNumber")}
          />
          {errors.identificationNumber && (
            <p className="error-text">{errors.identificationNumber.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="accountNumber">საბანკო ანგარიშის ნომერი (IBAN)</label>
          <input
            id="accountNumber"
            type="text"
            placeholder="GE29TB7777777777777777"
            {...registerField("accountNumber")}
          />
          {errors.accountNumber && (
            <p className="error-text">{errors.accountNumber.message}</p>
          )}
        </div>

        {/* Enhanced error message display */}
        {registrationError && (
          <div className="error-message">
            <p className="error-text">{registrationError}</p>
          </div>
        )}

        <button type="submit" className="submit-btn" disabled={isPending}>
          {isPending ? "რეგისტრაცია..." : "დარეგისტრირება"}
        </button>

        <div className="text-center">
          უკვე გაქვთ ანგარიში?{" "}
          <Link href="/login" className="login-link">
            შესვლა
          </Link>
        </div>
      </form>
    </div>
  );
}
