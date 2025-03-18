"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import axios, { AxiosError } from "axios";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface ResetPasswordFormData {
  password: string;
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>();
  const { toast } = useToast();
  const [isResetSuccessful, setIsResetSuccessful] = useState(false);

  const onSubmit: SubmitHandler<ResetPasswordFormData> = async (data) => {
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        resetToken: token,
        password: data.password,
      });

      toast({ title: "Success", description: "Password has been reset." });

      setIsResetSuccessful(true);
    } catch (error: unknown) {
      const err = error as AxiosError<{ message: string }>;
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        type="password"
        placeholder="New password"
        {...register("password", { required: "Password is required" })}
      />
      {errors.password && <span>{String(errors.password.message)}</span>}
      <button type="submit">Reset Password</button>

      {isResetSuccessful && (
        <button type="button" onClick={() => router.push("/login")}>
          Go to Login
        </button>
      )}
    </form>
  );
}
