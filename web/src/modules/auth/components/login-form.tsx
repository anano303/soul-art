"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../validation";
import { useLogin } from "../hooks/use-auth";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./login-form.css";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

import type * as z from "zod";

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { mutate: login, isLoading, error: hookError } = useLogin();
  const [loginError, setLoginError] = useState<string | null>(null);
  const router = useRouter();
  const [returnUrl, setReturnUrl] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get("returnUrl") || params.get("redirect") || "/";
    setReturnUrl(url);
  }, []);

  // Watch for errors from the hook
  useEffect(() => {
    if (hookError) {
      const errorMessage = hookError instanceof Error 
        ? hookError.message 
        : "ავტორიზაცია ვერ მოხერხდა";
      setLoginError(errorMessage);
    }
  }, [hookError]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
    setLoginError(null); // Clear previous errors
    
    try {
      login(data, {
        onSuccess: (response) => {
          if (response.success) {
            // Successfully logged in
            toast({
              title: "წარმატებული ავტორიზაცია",
              description: "კეთილი იყოს თქვენი დაბრუნება!",
              variant: "default"
            });
            router.push(returnUrl);
          } else {
            // Login was processed but returned an error
            setLoginError(response.error || "ავტორიზაცია ვერ მოხერხდა");
            toast({
              title: "ავტორიზაციის შეცდომა",
              description: response.error || "ავტორიზაცია ვერ მოხერხდა",
              variant: "destructive"
            });
          }
        },
        onError: (error) => {
          // Error from API call
          const errorMessage = error instanceof Error 
            ? error.message 
            : "ავტორიზაცია ვერ მოხერხდა";
          
          setLoginError(errorMessage);
          
          toast({
            title: "ავტორიზაციის შეცდომა",
            description: errorMessage,
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      // Unexpected error
      const errorMessage = error instanceof Error 
        ? error.message 
        : "სისტემური შეცდომა, გთხოვთ სცადოთ მოგვიანებით";
      
      setLoginError(errorMessage);
      
      toast({
        title: "ავტორიზაციის შეცდომა",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit(onSubmit)} className="login-form">
        <div className="input-group">
          <label htmlFor="email">ელ-ფოსტა</label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...register("email")}
            className={errors.email || loginError ? "error-input" : ""}
          />
          {errors.email && <p className="error-text">{errors.email.message}</p>}
        </div>

        <div className="input-group">
          <label htmlFor="password">პაროლი</label>
          <input
            id="password"
            type="password"
            placeholder="********"
            {...register("password")}
            className={errors.password || loginError ? "error-input" : ""}
          />
          {errors.password && (
            <p className="error-text">{errors.password.message}</p>
          )}
        </div>

        {loginError && (
          <div className="error-message">
            <p className="error-text">{loginError}</p>
          </div>
        )}

        <button
          type="submit"
          className="login-button"
          disabled={isLoading}
        >
          {isLoading ? <span className="loading-spinner"></span> : "შესვლა"}
        </button>

        <div className="separator">
          <span className="separator-text">ან გაიარეთ ავტორიზაცია</span>
        </div>

        <div className="social-buttons">
          <button type="button" className="social-button">
            <FaFacebook className="icon" />
            Facebook
          </button>
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="social-button"
          >
            <FaGoogle className="icon" />
            Google
          </button>
        </div>
      </form>
      <div className="forgot-password signup-text">
        <Link href="/forgot-password" className="signup-link">
          დაგავიწყდათ პაროლი?
        </Link>
      </div>

      <div className="signup-text">
        არ გაქვთ ანგარიში?{" "}
        <Link href="/register" className="signup-link">
          რეგისტრაცია
        </Link>
      </div>
    </div>
  );
}
