"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import axios, { AxiosError } from "axios";
import { useToast } from "@/hooks/use-toast";
import "./reset-password.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface ForgotPasswordFormData {
  email: string;
}

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const onSubmit: SubmitHandler<ForgotPasswordFormData> = async (data) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email: data.email,
      });

      toast({
        title: "Success",
        description: "Check your email for the reset link.",
      });
    } catch (error: unknown) {
      const err = error as AxiosError<{ message: string }>;
      toast({
        title: "Error",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="forPass" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
      <input
        type="email"
        placeholder="Enter your email"
        {...register("email", { required: "Email is required" })}
      />
      {errors.email && <span style={{ color: "red" }}>{errors.email.message}</span>}
      </div>
      <button type="submit" disabled={loading} className="w-full">
        {loading ? "Sending..." : "Send Reset Link"}
      </button>
    </form>
  );
}
