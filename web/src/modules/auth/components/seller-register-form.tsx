"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sellerRegisterSchema } from "../validation/seller-register-schema";
import { useSellerRegister } from "../hooks/use-auth";
import Link from "next/link";
import "./register-form.css";
import type * as z from "zod";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";

type SellerRegisterFormData = z.infer<typeof sellerRegisterSchema>;

export function SellerRegisterForm() {
  const router = useRouter();
  const { mutate: register, isPending } = useSellerRegister();
  const [registrationError, setRegistrationError] = useState<string | null>(
    null
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<SellerRegisterFormData>({
    resolver: zodResolver(sellerRegisterSchema),
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        if (e.target?.result) {
          setLogoPreview(e.target.result as string);
        }
      };
      fileReader.readAsDataURL(file);
    }
  };

  const onSubmit = handleSubmit((data) => {
    setRegistrationError(null);

    // Create FormData to handle file uploads
    const formData = new FormData();

    // Add all form fields to FormData
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value as string);
      }
    });

    // Add the logo file if it exists
    if (fileInputRef.current?.files?.length) {
      formData.append("logoFile", fileInputRef.current.files[0]);
    }

    register(formData, {
      onSuccess: () => {
        setIsSuccess(true);
        toast({
          title: "რეგისტრაცია წარმატებულია",
          description: "თქვენი, როგორც გამყიდველის ანგარიში წარმატებით შეიქმნა",
          variant: "default",
        });

        // Redirect to login page after 2 seconds
        setTimeout(() => {
          router.push("/login");
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
      },
    });
  });

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (isSuccess) {
    return (
      <div className="form-container">
        <div className="success-message">
          <h3>რეგისტრაცია წარმატებულია!</h3>
          <p>თქვენი ანგარიში წარმატებით შეიქმნა.</p>
          <p>გადამისამართება ავტორიზაციის გვერდზე...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container" id="seller-register-form">
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
          <label htmlFor="logoFile">ლოგო (არასავალდებულო)</label>
          <div className="logo-upload-container">
            {logoPreview && (
              <div className="logo-preview">
                <Image
                  src={logoPreview}
                  alt="Logo Preview"
                  width={100}
                  height={100}
                  className="logo-preview-image"
                />
              </div>
            )}
            <input
              ref={fileInputRef}
              id="logoFile"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="file-input"
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={triggerFileInput}
              className="logo-upload-button"
            >
              {logoPreview ? "შეცვლა" : "ლოგოს ატვირთვა"}
            </button>
          </div>
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
          <label htmlFor="identificationNumber">
            პირადი ნომერი / საიდენტ. კოდი
          </label>
          <input
            id="identificationNumber"
            type="text"
            placeholder="11-ნიშნა პირადი ნომერი / საიდენტ. კოდი"
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
