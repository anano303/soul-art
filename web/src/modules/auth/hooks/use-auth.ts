"use client";

import { useAuth as useGlobalAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { storeTokens, storeUserData } from "@/lib/auth";
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

export interface SellerRegisterData extends RegisterData {
  phone: string;
  address: string;
  shopName: string;
}

// Logout hook
export function useLogout() {
  const { logout } = useGlobalAuth();
  
  return {
    mutate: logout,
    logout
  };
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
        
        // Store tokens and user data
        if (response.data.tokens) {
          const { accessToken, refreshToken } = response.data.tokens;
          storeTokens(accessToken, refreshToken);
          storeUserData(response.data.user);
        }
        
        return response.data;
      } catch (error) {
        // Handle Axios errors properly to display server messages
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<{ message: string | string[] }>;
          if (axiosError.response?.data?.message) {
            const errorMessage = Array.isArray(axiosError.response.data.message) 
              ? axiosError.response.data.message.join(', ')
              : axiosError.response.data.message;
            throw new Error(errorMessage);
          }
        }
        // Generic error fallback
        throw new Error('რეგისტრაცია ვერ მოხერხდა, გთხოვთ სცადოთ თავიდან');
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
        
        // Store tokens and user data
        if (response.data.tokens) {
          const { accessToken, refreshToken } = response.data.tokens;
          storeTokens(accessToken, refreshToken);
          storeUserData(response.data.user);
        }
        
        return response.data;
      } catch (error) {
        // Handle Axios errors properly
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<{ message: string }>;
          if (axiosError.response?.data?.message) {
            throw new Error(axiosError.response.data.message);
          }
        }
        // Generic error fallback
        throw new Error('გამყიდველის რეგისტრაცია ვერ მოხერხდა, გთხოვთ სცადოთ თავიდან');
      }
    }
  });
  
  return {
    ...mutation,
    isPending: mutation.status === 'pending'
  };
}
