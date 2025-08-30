import { axios } from "@/lib/axios";
import { User } from "@/types";
import { storeTokens, storeUserData, clearTokens } from "@/lib/auth";

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
    sessionToken?: string;
  };
  user: User;
}

// Update to match the SellerRegisterDto from the backend
interface SellerRegisterData {
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

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await axios.post<AuthResponse>("/auth/login", credentials);
    
    if (response.data.tokens) {
      const { accessToken, refreshToken, sessionToken } = response.data.tokens;
      storeTokens(accessToken, refreshToken, sessionToken);
      storeUserData(response.data.user);
    }
    
    return response.data;
  },

  register: async (data: LoginCredentials & { name: string }) => {
    // რეგისტრაცია
    await axios.post("/auth/register", data);
    
    // ავტომატური ავტორიზაცია
    return authApi.login({ 
      email: data.email, 
      password: data.password 
    });
  },

  sellerRegister: async (data: SellerRegisterData) => {
    // Send seller registration data directly to the API
    const response = await axios.post<AuthResponse>("/auth/sellers-register", data);
    
    // Store tokens using hybrid auth system
    if (response.data.tokens) {
      const { accessToken, refreshToken, sessionToken } = response.data.tokens;
      storeTokens(accessToken, refreshToken, sessionToken);
      storeUserData(response.data.user);
    }
    
    return response.data;
  },

  getProfile: async () => {
    const response = await axios.get<User>("/auth/profile");
    return response.data;
  },

  logout: async () => {
    try {
      await axios.post("/auth/logout");
    } finally {
      clearTokens();
    }
  },
};
