"use client";

import { useAuth as useGlobalAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import axios, { AxiosError } from 'axios';
import { User } from "@/types";

// Define response types
interface AuthResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: User;
  success?: boolean;
  message?: string;
}

// Define registration data types
export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// Define seller registration data types
export interface SellerRegisterData {
  storeName: string;
  storeLogo?: string;
  ownerFirstName: string;
  ownerLastName: string;
  phoneNumber: string;
  email: string;
  password: string;
  identificationNumber: string;
  accountNumber: string;
}

// Logout hook
export function useLogout() {
  const { logout } = useGlobalAuth();
  
  return {
    mutate: logout,
    logout
  };
}

// Enhanced error handling function for consistent backend error extraction
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      message?: string | string[];
      error?: string;
      statusCode?: number;
    }>;
    
    // Extract error message from response data
    if (axiosError.response?.data) {
      const { data } = axiosError.response;
      
      // Handle array of error messages (typically from validation errors)
      if (data.message && Array.isArray(data.message)) {
        return data.message.join(', ');
      }
      
      // Handle single error message
      if (data.message && typeof data.message === 'string') {
        return data.message;
      }
      
      // Handle error field
      if (data.error && typeof data.error === 'string') {
        return data.error;
      }
    }
    
    // Handle network errors
    if (axiosError.message === 'Network Error') {
      return 'სერვერთან კავშირი ვერ მოხერხდა. გთხოვთ, შეამოწმოთ ინტერნეტ კავშირი.';
    }
    
    // Handle timeout errors
    if (axiosError.code === 'ECONNABORTED') {
      return 'მოთხოვნის დრო ამოიწურა. გთხოვთ, სცადოთ მოგვიანებით.';
    }
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }
  
  // Fallback for unknown error types
  return 'დაფიქსირდა უცნობი შეცდომა. გთხოვთ, სცადოთ მოგვიანებით.';
}

// Login hook 
export function useLogin() {
  const { login, loginStatus, loginError } = useGlobalAuth();
  
  return {
    mutate: login,
    isLoading: loginStatus === 'pending',
    isPending: loginStatus === 'pending',
    isError: loginStatus === 'error',
    error: loginError
  };
}

// Register hook
export function useRegister() {
  const mutation = useMutation<AuthResponse, Error, RegisterData>({
    mutationFn: async (userData: RegisterData) => {
      try {
        const response = await apiClient.post<AuthResponse>('/auth/register', userData);
        return response.data;
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        throw new Error(errorMessage);
      }
    }
  });
  
  return {
    ...mutation,
    isPending: mutation.status === 'pending'
  };
}

// Seller register hook
export function useSellerRegister() {
  const mutation = useMutation<AuthResponse, Error, SellerRegisterData>({
    mutationFn: async (userData: SellerRegisterData) => {
      try {
        const response = await apiClient.post<AuthResponse>('/auth/sellers-register', userData);
        return response.data;
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        throw new Error(errorMessage);
      }
    }
  });
  
  return {
    ...mutation,
    isPending: mutation.status === 'pending'
  };
}
