import { axios } from "@/lib/axios";
import { User } from "@/types";

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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
    
    if (response.data.accessToken && response.data.refreshToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
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
    
    // Store tokens and return the response
    if (response.data.accessToken && response.data.refreshToken) {
      const { accessToken, refreshToken } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },
};
