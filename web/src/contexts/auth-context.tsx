import { createContext, useContext } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
}

export const AuthContext = createContext<AuthContextType>({
  user: null
});

export const useAuthContext = () => useContext(AuthContext);
